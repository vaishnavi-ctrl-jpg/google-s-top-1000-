import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET() {
  try {
    const db = readDb();

    // Calculate metrics
    const totalSales = db.sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalProfit = db.sales.reduce((acc, s) => acc + s.profit, 0);
    const totalBills = db.sales.length;

    return NextResponse.json({
      success: true,
      metrics: {
        totalSales,
        totalProfit,
        totalBills
      },
      sales: db.sales,
      logs: db.logs
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
