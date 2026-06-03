import { runAgent0 } from './src/lib/agents';
import { readDb } from './src/lib/db';

async function runLocalVerification() {
  console.log('\n==================================================================');
  console.log('            VYAPAR-AGENT ACTIVE MULTI-AGENT PIPELINE TEST         ');
  console.log('==================================================================\n');
  
  // A realistic, messy cash bill from a thermal receipt printer
  const sampleBill = `
    ==================================
        KIRANA SUPER MART - PUNE
    ==================================
    DATE: 01-06-2026 15:42
    ----------------------------------
    * Amul Milk 500ml      2 QTY   x 30.00
    * Parle-G small        5 QTY   x  5.00
    * Maggi 2-Min         3 QTY   x 14.00
    ----------------------------------
    TOTAL AMOUNT: ₹117.00
    ==================================
  `;

  console.log('1. [SUPERVISOR AGENT] Parsing raw print job invoice...');
  const result = await runAgent0(sampleBill);

  console.log('\n2. [RESULTS] AI Workers Pipeline Summary:');
  console.log('------------------------------------------------------------------');
  console.log(`- Receipt Parser success: ${result.parsingSuccess}`);
  console.log(`- Items Extracted:`, JSON.stringify(result.parsedItems, null, 2));
  console.log(`- Inventory stock decrements:`, JSON.stringify(result.inventoryStatus.updatedItems, null, 2));
  console.log(`- Supervisor overview audit: "${result.supervisorSummary}"`);
  console.log(`- WhatsApp reorder alerts generated: ${result.procurementActions.length}`);
  console.log('------------------------------------------------------------------');

  console.log('\n3. [DATABASE LOGS] Verifying JSON state changes:');
  const db = readDb();
  console.log(`- Sales in database: ${db.sales.length}`);
  console.log(`- Current total sales revenue: ₹${db.sales.reduce((acc, s) => acc + s.totalAmount, 0)}`);
  console.log(`- Total computed profit: ₹${db.sales.reduce((acc, s) => acc + s.profit, 0)}`);
  console.log(`- Pending reorder alerts count: ${db.procurementAlerts.length}`);
  console.log('\n==================================================================');
}

runLocalVerification().catch(console.error);
