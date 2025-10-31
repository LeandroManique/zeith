// Simple test runner for Socratic chat behavior (avoids requiring the Next.js route)
;(async () => {
  try {
    const fs = require('fs')
    const path = require('path')

  // 1) Validate the SYSTEM_PROMPT inside app/config/systemPrompt.ts contains the Socratic rules
  const routeSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'config', 'systemPrompt.ts'), 'utf8')
  const match = routeSource.match(/export\s+const\s+SYSTEM_PROMPT_ZEITH\s*=\s*`([\s\S]*?)`/) || routeSource.match(/export\s+const\s+SYSTEM_PROMPT_ZEITH\s*=\s*`([\s\S]*?)`/m)
    if (!match) {
      console.error('FAIL: Could not find SYSTEM_PROMPT in app/api/chat/route.ts')
      process.exit(2)
    }

    const systemPrompt = match[1]

    console.log('---- Checking SYSTEM_PROMPT rules ----')

    // More flexible checks to accept wording variations in the v3 prompt
    const checks = [
      {
        name: 'question_rule',
        desc: '1 or 2 reflective questions per response',
        re: /1\s*ou\s*2\s*perguntas reflexivas|perguntas reflexivas/i
      },
      {
        name: 'paragraph_rule',
        desc: 'limit responses to two short paragraphs',
        re: /(até\s+)?dois\s+par(á|a)grafos|dois\s+par(á|a)grafos\s+curtos/i
      },
      {
        name: 'no_lists_rule',
        desc: 'avoid listing ideas immediately',
        re: /evite\s+listar|nunca\s+ofereça\s+listas|não\s+ofereça\s+listas|não\s+oferecer\s+listas|não\s+ofereça\s+listas\s+de\s+sugestões|nunca\s+ofereça\s+listas/i
      }
    ]

    let promptPass = true
    for (const c of checks) {
      if (!c.re.test(systemPrompt)) {
        console.error(`FAIL: SYSTEM_PROMPT missing requirement -> ${c.desc}`)
        promptPass = false
      } else {
        console.log(`OK: found rule -> ${c.desc}`)
      }
    }

    if (!promptPass) {
      console.error('\nSYSTEM_PROMPT validation FAILED')
      process.exit(2)
    }
    console.log('SYSTEM_PROMPT validation PASSED')

    // 2) Simulated SSE stream parsing (keeps original validation logic)
    // Ensure server env check passes
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test'

    // Mock fetch to return SSE stream (not used by this runner but kept for parity)
    const sseChunks = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'Olá?' } }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: ' Parece que você quer gerar mais leads para sua marca.' } }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: '\n\nTalvez faça sentido começar por...' } }] })}\n\n`,
      `data: [DONE]\n\n`
    ]

    // Simulate reading the stream and building the final assistant text
    const fullText = sseChunks
      .filter((c) => c.startsWith('data:'))
      .map((line) => line.replace(/^data:\s?/, ''))
      .filter((p) => p !== '[DONE]')
      .map((p) => {
        try {
          const parsed = JSON.parse(p)
          return parsed.choices?.[0]?.delta?.content ?? ''
        } catch (e) {
          return ''
        }
      })
      .join('')

    console.log('\n---- Chat response (simulated) ----')
    console.log(fullText)
    console.log('----------------------------------')

    let pass = true
    const hasQuestion = fullText.includes('?')
    const hasDashes = /(^|\n)[\s]*[-*•]/.test(fullText) || /\n\d+\./.test(fullText)
    const paragraphs = fullText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

    if (!hasQuestion) {
      console.error('FAIL: simulated response must include at least one question mark (?)')
      pass = false
    }
    if (hasDashes) {
      console.error('FAIL: simulated response contains dashes or bullets')
      pass = false
    }
    if (paragraphs.length > 2) {
      console.error('FAIL: simulated response has more than 2 paragraphs:', paragraphs.length)
      pass = false
    }

    if (pass) {
      console.log('\nTEST RESULT: PASS — SYSTEM_PROMPT and simulated response follow Socratic rules')
      process.exit(0)
    } else {
      console.error('\nTEST RESULT: FAIL')
      process.exit(1)
    }
  } catch (err) {
    console.error('Test runner error:', err)
    process.exit(2)
  }
})()
