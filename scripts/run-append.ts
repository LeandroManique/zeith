import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local variables into process.env for this script BEFORE importing the sheets helper
try {
  const envPath = join(process.cwd(), '.env.local')
  const envRaw = readFileSync(envPath, 'utf8')
  envRaw.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)\s*$/)
    if (m) {
      const key = m[1]
      let val = m[2]
      // remove surrounding quotes if any
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  })
} catch (e) {
  /* ignore if file not found */
}

// Import after env is loaded
// Note: remove the explicit .ts extension so TypeScript doesn't complain
// about importing .ts extensions unless `allowImportingTsExtensions` is enabled.
const { appendLeadToSheet } = await import('../lib/google/sheets.ts')

// Masked debug info (safe) to help confirm which client/spreadsheet are being used
const mask = (s = '') => (s ? s.slice(0, 6) + '...' + s.slice(-4) : 'undefined')
try {
  const cid = process.env.GOOGLE_CLIENT_ID || ''
  const sid = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
  console.log('[debug] using GOOGLE_CLIENT_ID=', mask(cid), ' GOOGLE_SHEETS_SPREADSHEET_ID=', mask(sid))
} catch (e) {
  /* ignore */
}

async function main() {
  try {
    console.log('Running appendLeadToSheet with test data...')
    const res = await appendLeadToSheet({
      name: 'Teste Zeith',
      email: 'teste@zeithco.com',
      origin: 'Landing ZEITH',
      score: 8,
      note: 'Teste de integração Google Sheets'
    })
    console.log('appendLeadToSheet result:', res)
  } catch (err: any) {
    console.error('appendLeadToSheet error:', err?.message ?? err)
    process.exit(1)
  }
}

main()
