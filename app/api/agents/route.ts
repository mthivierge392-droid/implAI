import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (clears every 10 seconds)
const requestStore = new Map<string, number[]>();

function isRateLimited(ip: string, limit: number = 10, windowMs: number = 10000): boolean {
  const now = Date.now();
  const requests = requestStore.get(ip) || [];
  const filtered = requests.filter(timestamp => now - timestamp < windowMs);
  filtered.push(now);
  requestStore.set(ip, filtered);
  return filtered.length > limit;
}

export async function PATCH(request: NextRequest) {
  try {
    // Get IP from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || 'anonymous';
    
    // Rate limit check (optional, lightweight)
    if (isRateLimited(ip, 10)) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer dans quelques secondes.' },
        { status: 429 }
      );
    }

    const { llm_id, general_prompt } = await request.json();

    if (!llm_id || !general_prompt) {
      return NextResponse.json(
        { error: 'llm_id et general_prompt requis' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.retellai.com/update-retell-llm/${llm_id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ general_prompt }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Erreur Retell:', error);
      return NextResponse.json(
        { error: 'Erreur mise à jour Retell' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur API:', error);
    return NextResponse.json(
      { error: 'Erreur interne' },
      { status: 500 }
    );
  }
}