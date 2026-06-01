import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BREVO_SMTP_LOGIN    = Deno.env.get('BREVO_SMTP_LOGIN')    ?? ''
const BREVO_SMTP_PASSWORD = Deno.env.get('BREVO_SMTP_PASSWORD') ?? ''
const HOTEL_NAME          = Deno.env.get('HOTEL_NAME')          ?? 'Kasubay Hotel'
const HOTEL_EMAIL         = Deno.env.get('HOTEL_EMAIL')         ?? 'noreply@kasubayhotel.com'
const APP_URL             = Deno.env.get('APP_URL')             ?? 'http://localhost:5173'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
}

function nights(b: BookingData) {
  return Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000)
}

function guestLine(b: BookingData) {
  return `${b.adults} adult${b.adults > 1 ? 's' : ''}${b.children > 0 ? `, ${b.children} child${b.children > 1 ? 'ren' : ''}` : ''}`
}

// ── Base layout ───────────────────────────────────────────────────────────────

function baseLayout(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin:0; padding:0; background:#f4f4f5; font-family:'Segoe UI',Arial,sans-serif; }
    .wrap { max-width:580px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }
    .header { background:#c89b2a; padding:28px 32px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; letter-spacing:.5px; }
    .header p { margin:6px 0 0; color:rgba(255,255,255,.8); font-size:13px; }
    .body { padding:32px; color:#1e293b; }
    .body h2 { margin:0 0 8px; font-size:20px; }
    .body p { margin:0 0 16px; font-size:14px; line-height:1.6; color:#475569; }
    .summary { background:#fafafa; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin:20px 0; }
    .summary-row { display:flex; justify-content:space-between; font-size:13px; padding:5px 0; border-bottom:1px solid #f1f5f9; }
    .summary-row:last-child { border:none; font-weight:700; font-size:14px; padding-top:10px; }
    .summary-row span:last-child { color:#1e293b; }
    .label { color:#64748b; }
    .code-box { background:#fffbeb; border:2px dashed #c89b2a; border-radius:8px; padding:16px; text-align:center; margin:20px 0; }
    .code-box .code { font-family:monospace; font-size:22px; font-weight:700; color:#c89b2a; letter-spacing:2px; }
    .code-box p { margin:6px 0 0; font-size:12px; color:#92400e; }
    .btn { display:inline-block; background:#c89b2a; color:#fff !important; text-decoration:none; padding:13px 32px; border-radius:8px; font-weight:700; font-size:14px; margin:8px 0; }
    .footer { background:#f8fafc; padding:20px 32px; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; }
    .badge { display:inline-block; padding:3px 10px; border-radius:99px; font-size:12px; font-weight:600; }
    .badge-confirmed  { background:#dcfce7; color:#166534; }
    .badge-checkedin  { background:#dbeafe; color:#1e40af; }
    .badge-checkedout { background:#f1f5f9; color:#475569; }
    .badge-cancelled  { background:#fee2e2; color:#991b1b; }
    .alert-red { background:#fff1f2; border:1px solid #fecdd3; border-radius:8px; padding:16px 20px; margin:16px 0; }
    .alert-blue { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px 20px; margin:16px 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>🏨 ${HOTEL_NAME}</h1>
      <p>Hospitality at its finest</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      © ${new Date().getFullYear()} ${HOTEL_NAME} · This is an automated email, please do not reply.
    </div>
  </div>
</body>
</html>`
}

// ── Email templates ───────────────────────────────────────────────────────────

function confirmationEmail(b: BookingData) {
  const n = nights(b)
  return baseLayout(`
    <h2>Booking Confirmed! 🎉</h2>
    <p>Hi <strong>${b.guest_name}</strong>, great news — your booking at <strong>${HOTEL_NAME}</strong> has been <span class="badge badge-confirmed">Confirmed</span>.</p>

    <div class="code-box">
      <div>Your Booking Code</div>
      <div class="code">${b.transaction_code}</div>
      <p>Keep this code — you'll need it at check-in.</p>
    </div>

    <div class="summary">
      <div class="summary-row"><span class="label">Room</span><span>${b.room_name}</span></div>
      <div class="summary-row"><span class="label">Check-In</span><span>${formatDate(b.check_in)}</span></div>
      <div class="summary-row"><span class="label">Check-Out</span><span>${formatDate(b.check_out)}</span></div>
      <div class="summary-row"><span class="label">Duration</span><span>${n} night${n !== 1 ? 's' : ''}</span></div>
      <div class="summary-row"><span class="label">Guests</span><span>${guestLine(b)}</span></div>
      <div class="summary-row"><span class="label">Payment Method</span><span>${b.payment_method}</span></div>
      ${b.promo_code ? `<div class="summary-row"><span class="label">Promo Applied</span><span>${b.promo_code}</span></div>` : ''}
      <div class="summary-row"><span class="label">Total Amount</span><span>₱${Number(b.total_amount).toLocaleString()}</span></div>
    </div>

    <p><strong>📍 What to bring on check-in:</strong><br/>
    A valid ID and your booking code above. Check-in time is from 2:00 PM onwards.</p>

    <p>We look forward to welcoming you! If you have any questions, feel free to contact us.</p>
  `)
}

function checkedInEmail(b: BookingData) {
  const n = nights(b)
  return baseLayout(`
    <h2>Welcome! You're Checked In 🛎️</h2>
    <p>Hi <strong>${b.guest_name}</strong>, you have successfully checked in to <strong>${HOTEL_NAME}</strong>. We hope you have a wonderful stay!</p>

    <div class="alert-blue">
      <p style="margin:0;font-size:14px;color:#1e40af;">
        <strong>Transaction Code:</strong> <span style="font-family:monospace;font-size:15px;">${b.transaction_code}</span>
      </p>
    </div>

    <div class="summary">
      <div class="summary-row"><span class="label">Room</span><span>${b.room_name}</span></div>
      <div class="summary-row"><span class="label">Check-In</span><span>${formatDate(b.check_in)}</span></div>
      <div class="summary-row"><span class="label">Check-Out</span><span>${formatDate(b.check_out)}</span></div>
      <div class="summary-row"><span class="label">Duration</span><span>${n} night${n !== 1 ? 's' : ''}</span></div>
      <div class="summary-row"><span class="label">Guests</span><span>${guestLine(b)}</span></div>
      <div class="summary-row"><span class="label">Total Amount</span><span>₱${Number(b.total_amount).toLocaleString()}</span></div>
    </div>

    <p>🔑 Please keep your room key safe and return it at the front desk upon checkout.<br/>
    Check-out time is at <strong>12:00 PM</strong>. Late checkout may be arranged with the front desk.</p>

    <p>If you need anything during your stay, our staff is available 24/7. Enjoy your time with us! 🌟</p>
  `)
}

function cancelledEmail(b: BookingData) {
  return baseLayout(`
    <h2>Booking Cancelled 😔</h2>
    <p>Hi <strong>${b.guest_name}</strong>, your booking at <strong>${HOTEL_NAME}</strong> has been <span class="badge badge-cancelled">Cancelled</span>.</p>

    <div class="alert-red">
      <p style="margin:0 0 8px;font-size:13px;color:#991b1b;font-weight:600;">Cancelled Booking Details</p>
      <p style="margin:0;font-size:13px;color:#7f1d1d;">
        Code: <strong style="font-family:monospace;">${b.transaction_code}</strong><br/>
        Room: ${b.room_name}<br/>
        Check-In: ${formatDate(b.check_in)}<br/>
        Check-Out: ${formatDate(b.check_out)}
      </p>
    </div>

    <p>If you believe this is a mistake or would like to make a new booking, please contact us or visit our website.</p>

    <p>We're sorry we couldn't accommodate you this time and hope to welcome you on a future occasion. 🙏</p>
  `)
}

function checkoutEmail(b: BookingData, feedbackUrl: string) {
  return baseLayout(`
    <h2>Thank You for Staying with Us! 🌟</h2>
    <p>Hi <strong>${b.guest_name}</strong>, we hope you had a wonderful stay at <strong>${HOTEL_NAME}</strong>. It was a pleasure hosting you!</p>

    <div class="summary">
      <div class="summary-row"><span class="label">Transaction Code</span><span style="font-family:monospace;color:#c89b2a">${b.transaction_code}</span></div>
      <div class="summary-row"><span class="label">Room</span><span>${b.room_name}</span></div>
      <div class="summary-row"><span class="label">Stay Period</span><span>${formatDate(b.check_in)} → ${formatDate(b.check_out)}</span></div>
      <div class="summary-row"><span class="label">Total Paid</span><span>₱${Number(b.total_amount).toLocaleString()}</span></div>
    </div>

    <p>Your feedback means the world to us and helps us improve for every guest. It only takes 30 seconds!</p>

    <div style="text-align:center;margin:28px 0;">
      <a href="${feedbackUrl}" class="btn">⭐ Leave Your Review</a>
    </div>

    <p style="font-size:13px;color:#94a3b8;text-align:center;">
      Or copy this link: <a href="${feedbackUrl}" style="color:#c89b2a;">${feedbackUrl}</a>
    </p>

    <p>We hope to see you again soon. Safe travels! 🙏</p>
  `)
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingData {
  transaction_code: string
  guest_name: string
  guest_email: string
  room_name: string
  check_in: string
  check_out: string
  adults: number
  children: number
  total_amount: number
  payment_method: string
  promo_code?: string
}

type EmailType = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'

// ── Sender (Brevo SMTP API) ───────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  const credentials = btoa(`${BREVO_SMTP_LOGIN}:${BREVO_SMTP_PASSWORD}`)
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_SMTP_PASSWORD,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: HOTEL_NAME, email: BREVO_SMTP_LOGIN },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? JSON.stringify(data))
  return data
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, booking } = await req.json() as { type: EmailType, booking: BookingData }

    if (!booking.guest_email) {
      return new Response(JSON.stringify({ skipped: 'no email on file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let subject = ''
    let html    = ''

    if (type === 'confirmed') {
      subject = `✅ Booking Confirmed — ${booking.transaction_code} | ${HOTEL_NAME}`
      html    = confirmationEmail(booking)
    } else if (type === 'checked_in') {
      subject = `🛎️ You're Checked In — ${booking.transaction_code} | ${HOTEL_NAME}`
      html    = checkedInEmail(booking)
    } else if (type === 'checked_out') {
      const feedbackUrl = `${APP_URL}/feedback?code=${booking.transaction_code}&name=${encodeURIComponent(booking.guest_name)}&email=${encodeURIComponent(booking.guest_email)}`
      subject = `Thank you for staying at ${HOTEL_NAME}! Leave us a review 🌟`
      html    = checkoutEmail(booking, feedbackUrl)
    } else if (type === 'cancelled') {
      subject = `❌ Booking Cancelled — ${booking.transaction_code} | ${HOTEL_NAME}`
      html    = cancelledEmail(booking)
    } else {
      return new Response(JSON.stringify({ error: 'unknown type' }), { status: 400, headers: corsHeaders })
    }

    const result = await sendEmail(booking.guest_email, subject, html)
    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-email error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
