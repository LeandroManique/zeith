import { appendLeadToSheet } from '@/lib/google/sheets'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, origin, score, note } = body || {}

    // Basic validation
    if (!name && !email) {
      return new Response(JSON.stringify({ success: false, error: 'name or email required' }), { status: 400 })
    }

    await appendLeadToSheet({ name, email, origin, score, note })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error('[leads/route] Error', err?.message ?? err)
    return new Response(JSON.stringify({ success: false, error: String(err?.message ?? err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
