import { SYSTEM_PROMPT_ZEITH } from '@/app/config/systemPrompt'

export const runtime = 'edge'

// We intentionally avoid instantiating the OpenAI client at module
// initialization time so the build step doesn't require OPENAI_API_KEY.
let openai: any = null
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let API_KEY = (process.env.OPENAI_API_KEY ?? '').trim();
    API_KEY = API_KEY.replace(/^"|"$/g, '');

    // Log masked info to help debugging without revealing the key
    if (API_KEY) {
      try {
        console.log(`[chat/route] OPENAI_API_KEY present (len=${API_KEY.length}, prefix=${API_KEY.slice(0,4)}...)`);
      } catch (e) {/* ignore logging errors */}
    }

    if (!API_KEY) {
      console.error('[API ERROR] OPENAI_API_KEY ausente ou inválida');
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not set. Crie o arquivo .env.local com OPENAI_API_KEY e reinicie o servidor.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const clientMessages = Array.isArray(body.messages) ? body.messages : [];
    // Normalize incoming messages to the shape { role, content }
    const normalized = clientMessages.map((m: any) => {
      if (m.role === 'user') return { role: 'user', content: m.text ?? m.content ?? '' };
      return { role: m.role === 'ai' || m.role === 'assistant' ? 'assistant' : 'user', content: m.text ?? m.content ?? '' };
    });
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT_ZEITH },
      ...normalized
    ];

    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          temperature: 0.4,
          max_tokens: 900
        })
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('[OPENAI API ERROR]', resp.status, errorText);
        return new Response(JSON.stringify({ error: 'Erro ao conectar com a OpenAI API', status: resp.status, details: errorText }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      // Aqui você pode continuar o streaming normalmente...
      // Por simplicidade, retornando o JSON completo:
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('[FETCH ERROR]', err);
      return new Response(JSON.stringify({ error: 'Erro de conexão com a OpenAI API', details: String(err) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error('[chat/route] erro geral', err);
    return new Response(JSON.stringify({ error: 'Erro inesperado na API', details: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
    }
