import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-3.5-sonnet';
  if (!key) return NextResponse.json({ ok: false, message: '❌ OPENROUTER_API_KEY not set' });

  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Reply with just the word OK.' }],
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://jaqyi.com',
        },
        timeout: 20_000,
      }
    );
    const reply = res.data?.choices?.[0]?.message?.content ?? '?';
    return NextResponse.json({
      ok: true,
      message: `✅ Connected — model: ${model}`,
      detail: `Response: "${reply.trim()}"`,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, message: `❌ ${String(err)}` }, { status: 500 });
  }
}
