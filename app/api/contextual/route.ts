import { NextResponse } from 'next/server'
import { analyzeContext } from '@/lib/contextualLead'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // accept either a prebuilt context string or messages array
    if (typeof body.context === 'string') {
      const res = await analyzeContext(body.context)
      return NextResponse.json(res)
    }

    const messages: { role?: string; content?: string }[] = body.messages || []
    const context = messages
      .slice(-8)
      .map((m) => `${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.content || ''}`)
      .join('\n')

    const analysis = await analyzeContext(context)
    console.log('[contextual] análise executada', analysis?.estado, analysis?.tema)
    return NextResponse.json(analysis)
  } catch (err: any) {
    console.error('[api/contextual] error', err?.message ?? err)
    // return a clean JSON response without stack traces
    return NextResponse.json({ estado: 'neutro', tema: 'outro', direcao: 'neutro' }, { status: 500 })
  }
}
