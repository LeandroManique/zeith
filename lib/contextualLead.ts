import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function analyzeContext(context: string) {
  const prompt = `
Você é a inteligência estratégica da ZEITH, treinada para compreender nuances humanas em diálogos reais.

Analise o contexto da conversa e identifique:

1. O estágio de intenção do usuário:
   - curiosidade
   - interesse
   - decisão
   - neutro

2. O tipo de necessidade implícita:
   - branding_estrategico
   - ia_automacao
   - desenvolvimento_web
   - outro

3. Uma breve sugestão de direção de resposta (sem redigir a fala exata),
   apenas descreva a intenção da resposta, por exemplo:
   - "reforçar autoridade técnica"
   - "demonstrar empatia e explorar o cenário do usuário"
   - "abrir espaço para coleta de contato de forma natural"

Retorne JSON puro no formato:
{
  "estado": "...",
  "tema": "...",
  "direcao": "..."
}

Use raciocínio contextual — evite suposições artificiais ou conclusões precipitadas.

Diálogo:
${context}
  `

  try {
    // Some SDK versions expose chat differently; cast to any to call chat completions
    const completion = await (openai as any).chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      // request a JSON object if supported
      response_format: { type: 'json_object' }
    })

    // Attempt to parse the response
    const raw = completion?.choices?.[0]?.message?.content || completion?.choices?.[0]?.text || completion?.output_text || '{}'
    try {
      return JSON.parse(String(raw))
    } catch (e) {
      // fallback: extract JSON substring
      const m = String(raw).match(/\{[\s\S]*\}/)
      if (m) return JSON.parse(m[0])
      return { estado: 'neutro', tema: 'outro', direcao: 'neutro' }
    }
  } catch (err) {
    console.error('[contextualLead] analyzeContext error', err)
    return { estado: 'neutro', tema: 'outro', direcao: 'neutro' }
  }
}
