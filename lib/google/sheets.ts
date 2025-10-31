import { google } from 'googleapis'

export async function appendLeadToSheet({
  name,
  email,
  origin,
  score,
  note
}: {
  name: string
  email: string
  origin: string
  score?: number
  note?: string
}) {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    })

    const sheets = google.sheets({ version: 'v4', auth })

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

  // Try to detect a suitable sheet/tab name automatically. This helps
  // avoid 'Unable to parse range' errors if the expected sheet name is
  // different or missing. We default to the first sheet title.
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const sheetTitle = meta.data.sheets?.[0]?.properties?.title || 'Sheet1'
  const range = `${sheetTitle}!A:F`

    const values = [[
      new Date().toISOString(),
      name,
      email,
      origin,
      score ?? '',
      note ?? ''
    ]]

    const resource = { values }

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: resource
    })

    console.log('[sheets] Lead appended successfully', res.status)
    return res.status
  } catch (err: any) {
    console.error('[sheets] Error appending lead', err.message)
    throw err
  }
}
