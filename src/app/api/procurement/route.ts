import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, addAgentLog } from '@/lib/db';

export async function GET() {
  try {
    const db = readDb();
    return NextResponse.json({ success: true, alerts: db.procurementAlerts });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = readDb();
    const { alertId } = await req.json();

    const alert = db.procurementAlerts.find(a => a.id === alertId);
    if (!alert) {
      return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
    }

    alert.status = 'sent';
    writeDb(db);
    addAgentLog('Agent 3 (Procurement Agent)', 'Reorder Confirmed', `Shop owner marked reorder message for ${alert.supplierName} (concerning ${alert.itemName}) as SENT.`);

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
