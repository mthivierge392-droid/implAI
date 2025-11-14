import { NextRequest, NextResponse } from 'next/server';

// This endpoint is now deprecated but kept for backward compatibility
// All agent updates should go through /api/agents
export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { error: 'Use /api/agents PATCH instead' },
    { status: 410 }
  );
}