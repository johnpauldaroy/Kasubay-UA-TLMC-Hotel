import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ADMIN_USERS = [
  {
    email: 'admin@kasubayhotel.com',
    password: 'Admin@1234',
    name: 'Super Admin',
  },
  {
    email: 'staff@kasubayhotel.com',
    password: 'Staff@1234',
    name: 'Hotel Staff',
  },
]

async function seedAdmins() {
  console.log('Seeding admin users...\n')

  for (const user of ADMIN_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name },
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`⚠  ${user.email} — already exists, skipping`)
      } else {
        console.error(`✗  ${user.email} — ${error.message}`)
      }
    } else {
      console.log(`✓  ${user.email} created (id: ${data.user.id})`)
    }
  }

  console.log('\nDone. Login credentials:')
  console.log('─────────────────────────────────────────')
  for (const u of ADMIN_USERS) {
    console.log(`  Email   : ${u.email}`)
    console.log(`  Password: ${u.password}`)
    console.log('─────────────────────────────────────────')
  }
}

seedAdmins()
