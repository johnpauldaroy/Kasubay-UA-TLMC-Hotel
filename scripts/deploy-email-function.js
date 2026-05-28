/**
 * Run this once to deploy the send-email Edge Function and set all secrets.
 * Usage: node scripts/deploy-email-function.js <YOUR_SUPABASE_ACCESS_TOKEN>
 *
 * Get your access token from: https://supabase.com/dashboard/account/tokens
 */
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const token = process.argv[2]
if (!token) {
  console.error('\nUsage: node scripts/deploy-email-function.js <ACCESS_TOKEN>')
  console.error('Get token from: https://supabase.com/dashboard/account/tokens\n')
  process.exit(1)
}

const PROJECT_REF  = 'vbaklzdyoddvfhfgkhzx'
const RESEND_KEY   = 're_cHTxy4xx_PKq4k5FEAL5TxV2TdG2RXxXa'

async function run() {
  console.log('\n1. Setting Edge Function secrets...')
  const secretsRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { name: 'RESEND_API_KEY', value: RESEND_KEY },
      { name: 'HOTEL_NAME',     value: 'Kasubay Hotel' },
      { name: 'HOTEL_EMAIL',    value: 'noreply@kasubayhotel.com' },
      { name: 'APP_URL',        value: 'http://localhost:5173' },
    ]),
  })
  if (secretsRes.ok) {
    console.log('   ✓ Secrets set successfully')
  } else {
    console.error('   ✗ Failed to set secrets:', await secretsRes.text())
    process.exit(1)
  }

  console.log('\n2. Deploying send-email Edge Function...')
  try {
    execSync(
      `npx supabase functions deploy send-email --project-ref ${PROJECT_REF}`,
      {
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
        cwd: process.cwd(),
        stdio: 'inherit',
      }
    )
    console.log('   ✓ Function deployed successfully')
  } catch (err) {
    console.error('   ✗ Deploy failed:', err.message)
    process.exit(1)
  }

  console.log('\n✅ All done! Email notifications are now active.')
  console.log('   - Booking Confirmed → confirmation email sent')
  console.log('   - Checked Out       → checkout + feedback link email sent')
  console.log('   - Feedback page     → /feedback?code=TRX-...\n')
}

run()
