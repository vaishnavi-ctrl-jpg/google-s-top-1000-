import { NextRequest, NextResponse } from 'next/server';
import { runAgent0 } from '@/lib/agents';
import { addAgentLog } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { receiptText } = await req.json();

    if (!receiptText || typeof receiptText !== 'string') {
      return NextResponse.json(
        { success: false, error: 'receiptText field is required and must be a string' },
        { status: 400 }
      );
    }

    const report = await runAgent0(receiptText);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Supervisor API call failed:', error);
    addAgentLog('Agent 0 (Supervisor)', 'API Exception', `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
