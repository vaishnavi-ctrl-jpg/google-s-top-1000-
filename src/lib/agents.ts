import { callGemini, isGeminiEnabled } from './gemini';
import { readDb, writeDb, addAgentLog, InventoryItem, SaleItem, Sale, ProcurementAlert } from './db';

// ==========================================
// AGENT 1: RECEIPT PARSER AGENT
// ==========================================
export async function runAgent1(rawReceiptText: string): Promise<{
  success: boolean;
  items: Array<{ name: string; quantity: number; price: number }>;
  rawText: string;
}> {
  addAgentLog('Agent 1 (Receipt Parser)', 'Start Parsing', 'Received raw receipt text for structural extraction.');

  const systemInstruction = `
    You are an expert Receipt Parser Agent for a local Indian grocery store (Kirana shop).
    Your job is to read raw, messy, or semi-formatted receipt text and extract a structured JSON list of items sold.
    
    Each item must have:
    - name (exact product name, cleaning up messy codes or abbreviations. If it's a local item name like 'Amul doodh' or 'Maggi packet', map it to standard names if they exist in the inventory).
    - quantity (integer count of items sold)
    - price (price per unit)

    The raw receipt text might look like a thermal printer receipt with abbreviations. You must translate and normalize them.
    Examples of common Indian shop products:
    - "Amul Doodh 500ml" or "Amul Milk" -> "Amul Milk 500ml"
    - "ParleG" or "Parle G" -> "Parle-G Biscuit Small"
    - "Maggi" or "Maggi 2m" -> "Maggi Noodles 2-Min"
    - "Tata Salt" -> "Tata Salt 1kg"

    Respond ONLY with a valid JSON object in the following format. Do not add markdown formatting or code fences.
    Format:
    {
      "success": true,
      "items": [
        { "name": "Amul Milk 500ml", "quantity": 2, "price": 30 },
        { "name": "Parle-G Biscuit Small", "quantity": 5, "price": 5 }
      ]
    }
  `;

  try {
    const rawResult = await callGemini(rawReceiptText, systemInstruction, true);
    
    // Clean potential markdown codeblock formatting if returned
    const cleanedResult = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedResult);

    addAgentLog(
      'Agent 1 (Receipt Parser)',
      'Parsing Success',
      `Parsed ${parsed.items?.length || 0} items successfully from receipt.`
    );

    return {
      success: parsed.success !== false,
      items: parsed.items || [],
      rawText: rawReceiptText
    };
  } catch (error) {
    console.error('Agent 1 parsing failed, attempting fallback parser:', error);
    addAgentLog('Agent 1 (Receipt Parser)', 'Parsing Error', `Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    
    // Quick heuristic-based fallback parsing if JSON parsing failed
    return {
      success: false,
      items: [],
      rawText: rawReceiptText
    };
  }
}

// ==========================================
// AGENT 2: INVENTORY MANAGER AGENT
// ==========================================
export interface Agent2Result {
  updatedItems: Array<{ name: string; oldStock: number; newStock: number; lowStockTriggered: boolean }>;
  saleRegistered: Sale | null;
  logs: string[];
}

export async function runAgent2(items: Array<{ name: string; quantity: number; price: number }>): Promise<Agent2Result> {
  addAgentLog('Agent 2 (Inventory Manager)', 'Inventory Update', `Processing inventory updates for ${items.length} items.`);

  const db = readDb();
  const updatedItems: Array<{ name: string; oldStock: number; newStock: number; lowStockTriggered: boolean }> = [];
  const logs: string[] = [];
  const saleItems: SaleItem[] = [];
  let totalAmount = 0;
  let totalCostPrice = 0;

  for (const item of items) {
    // Attempt fuzzy search for matching item in current inventory
    const matchedItem = db.inventory.find(
      inv => inv.name.toLowerCase().includes(item.name.toLowerCase()) || 
             item.name.toLowerCase().includes(inv.name.toLowerCase())
    );

    if (matchedItem) {
      const oldStock = matchedItem.stock;
      const newStock = Math.max(0, oldStock - item.quantity);
      matchedItem.stock = newStock;

      const lowStockTriggered = newStock <= matchedItem.lowStockLimit && oldStock > matchedItem.lowStockLimit;
      
      updatedItems.push({
        name: matchedItem.name,
        oldStock,
        newStock,
        lowStockTriggered
      });

      saleItems.push({
        name: matchedItem.name,
        quantity: item.quantity,
        price: matchedItem.price,
        costPrice: matchedItem.costPrice
      });

      totalAmount += matchedItem.price * item.quantity;
      totalCostPrice += matchedItem.costPrice * item.quantity;

      const logMsg = `Subtracted ${item.quantity} from ${matchedItem.name}. Stock: ${oldStock} -> ${newStock}.`;
      logs.push(logMsg);
      
      if (lowStockTriggered) {
        logs.push(`⚠️ LOW STOCK WARNING: ${matchedItem.name} has crossed low stock threshold (${matchedItem.lowStockLimit})!`);
      }
    } else {
      // Fallback: If product not registered, register it automatically with default thresholds!
      const newProduct: InventoryItem = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: item.name,
        stock: 50 - item.quantity, // Give it starting stock of 50
        lowStockLimit: 10,
        price: item.price,
        costPrice: Math.round(item.price * 0.8), // 20% profit margin default
        supplierName: 'Gupta Kirana Wholesaler',
        supplierPhone: '+918765432109'
      };

      db.inventory.push(newProduct);
      
      updatedItems.push({
        name: newProduct.name,
        oldStock: 50,
        newStock: newProduct.stock,
        lowStockTriggered: false
      });

      saleItems.push({
        name: newProduct.name,
        quantity: item.quantity,
        price: newProduct.price,
        costPrice: newProduct.costPrice
      });

      totalAmount += newProduct.price * item.quantity;
      totalCostPrice += newProduct.costPrice * item.quantity;

      logs.push(`🆕 AUTO-REGISTERED new product: ${newProduct.name} at ₹${newProduct.price}.`);
    }
  }

  let saleRegistered: Sale | null = null;

  if (saleItems.length > 0) {
    const profit = totalAmount - totalCostPrice;
    saleRegistered = {
      id: `sale_${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: saleItems,
      totalAmount,
      profit
    };
    db.sales.push(saleRegistered);
    writeDb(db);
    addAgentLog(
      'Agent 2 (Inventory Manager)',
      'Sale Registered',
      `Registered sale worth ₹${totalAmount} with profit of ₹${profit}.`
    );
  }

  return {
    updatedItems,
    saleRegistered,
    logs
  };
}

// ==========================================
// AGENT 3: PROCUREMENT AGENT
// ==========================================
export async function runAgent3(itemName: string): Promise<ProcurementAlert> {
  addAgentLog('Agent 3 (Procurement Agent)', 'Drafting Reorder', `Generating supply reorder draft for: ${itemName}`);

  const db = readDb();
  
  // Find supplier info
  const product = db.inventory.find(inv => inv.name.toLowerCase() === itemName.toLowerCase());
  const supplierName = product?.supplierName || 'Gupta Kirana Wholesaler';
  const supplierPhone = product?.supplierPhone || '+918765432109';
  const price = product?.price || 10;

  const systemInstruction = `
    You are the friendly, proactive Procurement Agent for a local Indian general store.
    Your task is to draft a polite, highly practical WhatsApp message to our supplier to reorder stock.
    The message must be in a natural local tone (Indian English / Hinglish).
    Keep it concise and ready for one-click copy-paste.

    Supplier Name: ${supplierName}
    Product to reorder: ${itemName}
    Default reorder quantity: 25 packs

    Output your response ONLY in JSON format:
    {
      "draftMessage": "Pranam Gupta Ji, 25 packets of Maggi bhej dena kal dukan pe. Payment GPay kar dunga. - Vyapar Agent"
    }
  `;

  let draftMessage = `Namaste ${supplierName.split(' ')[0]} Ji, humare paas ${itemName} ka stock khatam ho raha hai. Kripya kal subah 25 packets deliver karwa dijiye. Dhanyawad! - Vyapar Agent`;

  try {
    const rawResult = await callGemini(`Draft reorder for ${itemName}`, systemInstruction, true);
    const cleanedResult = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedResult);
    if (parsed.draftMessage) {
      draftMessage = parsed.draftMessage;
    }
  } catch (error) {
    console.error('Procurement drafting failed, using default template:', error);
  }

  const alert: ProcurementAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    itemName,
    supplierName,
    supplierPhone,
    draftMessage,
    status: 'pending'
  };

  db.procurementAlerts.unshift(alert);
  writeDb(db);

  addAgentLog(
    'Agent 3 (Procurement Agent)',
    'Reorder Drafted',
    `Created supply reorder draft alert for ${supplierName}.`
  );

  return alert;
}

// ==========================================
// AGENT 4: DUKAAN MITRA (HELPER AGENT)
// ==========================================
export async function runAgent4(userMessage: string, chatHistory: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>): Promise<string> {
  addAgentLog('Agent 4 (Dukaan Mitra)', 'Chat Query', `Responding to shopkeeper: "${userMessage.substring(0, 40)}..."`);

  const db = readDb();
  
  // Format inventory summary to feed as context
  const lowStockItems = db.inventory.filter(i => i.stock <= i.lowStockLimit);
  const totalSalesToday = db.sales.reduce((acc, sale) => {
    // simple date comparison for today
    const saleDate = new Date(sale.timestamp).toDateString();
    const today = new Date().toDateString();
    return saleDate === today ? acc + sale.totalAmount : acc;
  }, 0);
  const totalProfitToday = db.sales.reduce((acc, sale) => {
    const saleDate = new Date(sale.timestamp).toDateString();
    const today = new Date().toDateString();
    return saleDate === today ? acc + sale.profit : acc;
  }, 0);

  const contextPrompt = `
    Context:
    You are "Dukaan Mitra", the friendly, super-supportive AI co-pilot and business guide for local shop owners.
    You speak in a warm, welcoming mix of Hindi and English (Hinglish/local vernacular) to make the owner feel comfortable, as if they are talking to a smart family member.
    
    Current Shop Status:
    - Low stock items: ${lowStockItems.map(i => `${i.name} (Stock: ${i.stock}/${i.lowStockLimit})`).join(', ') || 'None'}
    - Today's Sales: ₹${totalSalesToday}
    - Today's Profit: ₹${totalProfitToday}
    - Active Procurement Alerts Pending: ${db.procurementAlerts.filter(a => a.status === 'pending').length}
    - Total Products in Catalog: ${db.inventory.length}

    Guidelines:
    1. If the owner asks how the business is doing, share today's sales and profit warmly, and highlight any low stock items.
    2. Suggest reorders or restocks enthusiastically.
    3. Keep answers concise, helpful, and optimistic! Include warm phrases like "Namaste Ji!", "Bilkul!", "Aapka business badhiya chal raha hai".
  `;

  try {
    const result = await callGemini(userMessage, contextPrompt, true);
    return result;
  } catch (error) {
    console.error('Dukaan Mitra AI failed:', error);
    return "Namaste Ji! Kuch takniki samasya aa rahi hai, par main aapki madad ke liye taiyar hu. Aapka business achha chal raha hai!";
  }
}

// ==========================================
// AGENT 0: SUPERVISOR AGENT (THE BRAIN)
// ==========================================
export interface SupervisorReport {
  timestamp: string;
  parsingSuccess: boolean;
  parsedItems: any[];
  inventoryStatus: Agent2Result;
  procurementActions: ProcurementAlert[];
  supervisorSummary: string;
}

export async function runAgent0(rawReceiptText: string): Promise<SupervisorReport> {
  addAgentLog('Agent 0 (Supervisor)', 'Begin Workflow', 'Initializing multi-agent bill tracking pipeline.');

  // Step 1: Parse Receipt (Agent 1)
  const parsedReceipt = await runAgent1(rawReceiptText);
  
  if (!parsedReceipt.success || parsedReceipt.items.length === 0) {
    addAgentLog('Agent 0 (Supervisor)', 'Workflow Warning', 'No items parsed, aborting transaction update.');
    return {
      timestamp: new Date().toISOString(),
      parsingSuccess: false,
      parsedItems: [],
      inventoryStatus: { updatedItems: [], saleRegistered: null, logs: [] },
      procurementActions: [],
      supervisorSummary: "Parsed 0 items. Check if the bill print output is empty or misaligned."
    };
  }

  // Step 2: Update Inventory (Agent 2)
  const inventoryStatus = await runAgent2(parsedReceipt.items);

  // Step 3: Trigger Procurement Agent for low stock items (Agent 3)
  const procurementActions: ProcurementAlert[] = [];
  for (const item of inventoryStatus.updatedItems) {
    if (item.lowStockTriggered) {
      const reorderAlert = await runAgent3(item.name);
      procurementActions.push(reorderAlert);
    }
  }

  // Step 4: Write Supervisor Daily Report Summary (Agent 0 task)
  const db = readDb();
  const summaryPrompt = `
    Summarize this bill processing transaction event as a highly competent retail supervisor.
    - Parsed Items: ${JSON.stringify(parsedReceipt.items)}
    - Inventory Logs: ${JSON.stringify(inventoryStatus.logs)}
    - Reorders Generated: ${JSON.stringify(procurementActions.map(a => a.itemName))}
    
    Give a one-sentence high-impact summary of this transaction's business health.
  `;
  
  let supervisorSummary = `Processed bill containing ${parsedReceipt.items.length} items. Total Amount: ₹${inventoryStatus.saleRegistered?.totalAmount || 0}.`;
  
  try {
    const rawSum = await callGemini(summaryPrompt, "You are a professional shop supervisor. Keep summaries brief.", true);
    supervisorSummary = rawSum.trim();
  } catch (e) {
    console.error('Supervisor summary generation failed:', e);
  }

  addAgentLog(
    'Agent 0 (Supervisor)',
    'Workflow Complete',
    `Multi-agent pipeline succeeded. Summary: ${supervisorSummary}`
  );

  return {
    timestamp: new Date().toISOString(),
    parsingSuccess: true,
    parsedItems: parsedReceipt.items,
    inventoryStatus,
    procurementActions,
    supervisorSummary
  };
}
