import { NextRequest, NextResponse } from 'next/server';
import { runAgent4 } from '@/lib/agents';
import { addAgentLog } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'message field is required' },
        { status: 400 }
      );
    }

    const responseText = await runAgent4(message, history || []);
    return NextResponse.json({ success: true, response: responseText });
  } catch (error) {
    console.error('Dukaan Mitra Helper API failed:', error);
    addAgentLog('Agent 4 (Dukaan Mitra)', 'API Exception', `Internal error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
