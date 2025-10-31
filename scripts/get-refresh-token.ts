import { google } from 'googleapis'
import { readFileSync } from 'fs'
import { join } from 'path'
import readline from 'readline'

async function main() {
  try {
    // Path to the client secret JSON file in project root
    const credPath = join(process.cwd(), 'client_secret_372833951011-g5sm7uf2vh6i3oj7j5uvvau4k0amoimu.apps.googleusercontent.com.json')

    const content = readFileSync(credPath, 'utf8')
    const credentials = JSON.parse(content)

  const { client_id, client_secret } = (credentials.web || credentials.installed)
  const redirectUri = credentials.installed.redirect_uris[0]

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri)

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ]
    })

    console.log('\nAuthorize this app by visiting this URL:\n')
    console.log(authUrl)

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    const question = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve))

    const code = (await question('\nEnter the authorization code here: ')).trim()
    rl.close()

    const { tokens } = await oAuth2Client.getToken(code)

    console.log('\nYour REFRESH TOKEN:\n')
    console.log(tokens.refresh_token)

    console.log('\nCopy the refresh token into your .env.local as GOOGLE_REFRESH_TOKEN=...')
  } catch (err: any) {
    console.error('Error generating refresh token:', err?.message ?? err)
    process.exit(1)
  }
}

main()
