import { test, expect, vi } from 'vitest'

// Import the POST handler directly
import * as chatRoute from '../app/api/chat/route'

test('chat responds with Socratic behavior', async () => {
  // Ensure env key present to pass server check
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test'

  // Mock global fetch used inside the route to call OpenAI API.
  // Return a streaming SSE body that simulates a Socratic reply.
  const sseChunks = [
    `data: ${JSON.stringify({ choices: [{ delta: { content: 'Olá?' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: { content: ' Parece que você quer gerar mais leads para sua marca.' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: { content: '\n\nTalvez faça sentido começar por...' } }] })}\n\n`,
    `data: [DONE]\n\n`
  ]

  globalThis.fetch = vi.fn(async () => {
    // create a ReadableStream of the chunks
    const stream = new ReadableStream({
      start(controller) {
        for (const c of sseChunks) {
          controller.enqueue(new TextEncoder().encode(c))
        }
        controller.close()
      }
    })

    return {
      ok: true,
      body: stream,
      headers: new Headers({ 'content-type': 'text/event-stream' })
    } as any
  })

  // Create a fake Request-like object with json() that returns messages
  const fakeReq = {
    json: async () => ({ messages: [{ role: 'user', text: 'Quero gerar mais leads para minha marca.' }] })
  } as unknown as Request

  // Call the route handler
  const res = await (chatRoute as any).POST(fakeReq)
  expect(res).toBeDefined()

  // Read the response stream as text
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let done = false
  let collected = ''

  while (!done) {
    const { value, done: d } = await reader.read()
    done = d
    if (value) collected += decoder.decode(value)
  }

  // The collected text will be SSE payloads; extract JSON data lines
  const dataLines = collected.split(/\r?\n/).filter((l) => l.startsWith('data:'))
  const fullText = dataLines
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

  // Validation rules
  expect(fullText.includes('?')).toBe(true)
  expect(fullText.includes('-')).toBe(false)
  expect(fullText.includes('•')).toBe(false)

  const paragraphs = fullText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  expect(paragraphs.length).toBeLessThanOrEqual(2)
})
