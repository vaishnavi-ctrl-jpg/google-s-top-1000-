import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, addAgentLog, InventoryItem } from '@/lib/db';

export async function GET() {
  try {
    const db = readDb();
    return NextResponse.json({ success: true, inventory: db.inventory });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to read database' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = readDb();
    const data = await req.json();

    // 1. Check if restock request
    if (data.action === 'restock') {
      const { itemId, amount } = data;
      const item = db.inventory.find(i => i.id === itemId);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      }
      const oldStock = item.stock;
      item.stock += Number(amount);
      writeDb(db);
      addAgentLog('System', 'Inventory Restock', `Manually restocked ${item.name} by +${amount}. Stock: ${oldStock} -> ${item.stock}`);
      return NextResponse.json({ success: true, item });
    }

    // 2. Otherwise treat as new product creation
    const { name, stock, lowStockLimit, price, costPrice, supplierName, supplierPhone } = data;
    if (!name || !price) {
      return NextResponse.json({ success: false, error: 'Product name and price are required' }, { status: 400 });
    }

    const newProduct: InventoryItem = {
      id: `prod_${Date.now()}`,
      name,
      stock: Number(stock) || 0,
      lowStockLimit: Number(lowStockLimit) || 10,
      price: Number(price),
      costPrice: Number(costPrice) || Math.round(price * 0.8),
      supplierName: supplierName || 'Gupta Kirana Wholesaler',
      supplierPhone: supplierPhone || '+918765432109'
    };

    db.inventory.push(newProduct);
    writeDb(db);
    addAgentLog('System', 'Product Created', `Added new product to catalog: ${newProduct.name} with stock of ${newProduct.stock}.`);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
