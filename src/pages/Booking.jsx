import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, generateTransactionCode, calculateNights } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BedDouble, Search, Users, Star, ChevronLeft, ChevronRight,
  Calendar, Check, Printer, Wifi, AirVent, Tv, ArrowLeft,
  Info, Tag, Shield, Clock, X, CheckCircle2, Sparkles,
} from 'lucide-react'
import { format, addDays } from 'date-fns'

const EXTRA_GUEST_FEE = 150

function amenityIcon(a) {
  if (a.toLowerCase().includes('wifi'))                      return <Wifi className="h-3.5 w-3.5" />
  if (a.toLowerCase().includes('air') || a.toLowerCase().includes('ac')) return <AirVent className="h-3.5 w-3.5" />
  if (a.toLowerCase().includes('tv'))                        return <Tv className="h-3.5 w-3.5" />
  return null
}

function RoomCard({ room, onBook, onView }) {
  const img = room.images?.[0] || `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=70`
  const isEvent = room.tag === 'event'

  return (
    <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/60 bg-white">
      <div className="relative overflow-hidden h-52">
        <img
          src={img}
          alt={room.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {room.tag && (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-primary text-white px-2.5 py-1 rounded-full shadow">
              <Tag className="h-3 w-3" />{room.tag.toUpperCase()}
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shadow ${
            room.available ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {room.available ? (
              <><CheckCircle2 className="h-3 w-3" /> Available</>
            ) : (
              <><X className="h-3 w-3" /> Full</>
            )}
          </span>
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <h3 className="text-white font-bold text-base">{room.name}</h3>
          <div className="flex items-center gap-3 text-white/80 text-xs mt-0.5">
            <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {room.capacity} bed{room.capacity > 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Up to {room.max_guests} guests</span>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Amenities */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(room.amenities || []).slice(0, 4).map(a => (
            <span key={a} className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
              {amenityIcon(a)}{a}
            </span>
          ))}
          {(room.amenities || []).length > 4 && (
            <span className="text-xs text-muted-foreground px-2 py-1">+{room.amenities.length - 4} more</span>
          )}
        </div>

        {/* Price & actions */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Starting from</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">{formatCurrency(room.price)}</span>
              <span className="text-xs text-muted-foreground">/night</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold">4.8</span>
            <span className="text-muted-foreground">(24)</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-border hover:border-primary hover:text-primary"
            onClick={() => onView(room)}
          >
            View Details
          </Button>
          <Button
            size="sm"
            className="flex-1 font-semibold"
            disabled={!room.available}
            onClick={() => onBook(room)}
          >
            {room.available ? 'Book Now' : 'Unavailable'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const STEP_LABELS = ['Dates & Guests', 'Preferences', 'Confirm']

function StepIndicator({ current }) {
  return (
    <div className="flex items-center w-full mb-2">
      {STEP_LABELS.map((label, idx) => {
        const step = idx + 1
        const done = step < current
        const active = step === current
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                done   ? 'bg-primary text-white shadow-md' :
                active ? 'bg-primary text-white ring-4 ring-primary/20 shadow-md' :
                         'bg-muted text-muted-foreground'
              }`}>
                {done ? <Check className="h-4 w-4" /> : step}
              </div>
              <span className={`text-xs font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${step < current ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function BookingWizard({ room, checkIn, checkOut, onClose }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    checkIn:  checkIn  || format(new Date(), 'yyyy-MM-dd'),
    checkOut: checkOut || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    adults: 1, children: 0,
    name: '', email: '', phone: '',
    specialRequests: '', promoCode: '',
    paymentMethod: 'Cash',
    agreed: false,
  })
  const [promo, setPromo] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(null)
  const { toast } = useToast()

  const nights      = calculateNights(form.checkIn, form.checkOut)
  const totalGuests = form.adults + form.children
  const extraGuests = Math.max(0, totalGuests - room.max_guests)
  const extraFee    = extraGuests * EXTRA_GUEST_FEE * nights
  const baseAmount  = room.price * nights
  const discount    = promo ? Math.round(baseAmount * promo.discount_pct / 100) : 0
  const totalAmount = baseAmount + extraFee - discount

  async function applyPromo() {
    if (!form.promoCode.trim()) return
    setPromoLoading(true)
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', form.promoCode.toUpperCase())
      .eq('is_active', true)
      .single()
    setPromoLoading(false)
    if (data) {
      setPromo(data)
      toast({ title: `Promo applied!`, description: `${data.discount_pct}% discount added.` })
    } else {
      toast({ title: 'Invalid promo code', description: 'Please check and try again.', variant: 'destructive' })
    }
  }

  async function handleSubmit() {
    setLoading(true)
    const txCode = generateTransactionCode()
    let guestId = null
    if (form.email) {
      const { data: existingGuest } = await supabase
        .from('guests').select('id').eq('email', form.email).single()
      if (existingGuest) {
        guestId = existingGuest.id
      } else {
        const { data: newGuest } = await supabase
          .from('guests')
          .insert([{ name: form.name, email: form.email, phone: form.phone }])
          .select('id').single()
        if (newGuest) guestId = newGuest.id
      }
    }

    const { data, error } = await supabase.from('bookings').insert([{
      transaction_code: txCode,
      guest_id: guestId,
      guest_name:   form.name,
      guest_email:  form.email,
      guest_phone:  form.phone,
      room_id:      room.id,
      room_name:    room.name,
      check_in:     form.checkIn,
      check_out:    form.checkOut,
      adults:       form.adults,
      children:     form.children,
      total_guests: totalGuests,
      promo_code:   promo?.code || null,
      discount,
      base_amount:       baseAmount,
      extra_guest_fee:   extraFee,
      total_amount:      totalAmount,
      payment_method:    form.paymentMethod,
      special_requests:  form.specialRequests,
      status: 'Pending',
    }]).select().single()

    setLoading(false)
    if (error) {
      toast({ title: 'Booking failed', description: error.message, variant: 'destructive' })
    } else {
      setDone({ ...data, nights, promo })
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto mb-4 shadow-inner">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-700">Booking Confirmed!</h3>
          <p className="text-muted-foreground text-sm mt-1">Your reservation is pending hotel confirmation.</p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Transaction Code</p>
          <p className="font-mono text-2xl font-bold text-primary tracking-widest">{done.transaction_code}</p>
          <p className="text-xs text-muted-foreground mt-1">Save this code for your records</p>
        </div>

        <Card className="border border-border/60">
          <CardContent className="p-4 space-y-2.5 text-sm">
            {[
              { label: 'Guest',     value: done.guest_name },
              { label: 'Room',      value: done.room_name },
              { label: 'Check-In',  value: done.check_in },
              { label: 'Check-Out', value: done.check_out },
              { label: 'Nights',    value: done.nights },
              { label: 'Payment',   value: done.payment_method },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2.5 font-bold text-base">
              <span>Total Amount</span>
              <span className="text-primary">{formatCurrency(done.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pending Confirmation</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print Receipt
          </Button>
          <Button className="flex-1 font-semibold" onClick={onClose}>Done</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <StepIndicator current={step} />

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Check-In
              </Label>
              <Input
                type="date"
                value={form.checkIn}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Check-Out
              </Label>
              <Input
                type="date"
                value={form.checkOut}
                min={form.checkIn}
                onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))}
                className="h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Adults</Label>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="px-3 py-2 text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => setForm(f => ({ ...f, adults: Math.max(1, f.adults - 1) }))}
                >−</button>
                <span className="flex-1 text-center text-sm font-semibold py-2">{form.adults}</span>
                <button
                  type="button"
                  className="px-3 py-2 text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => setForm(f => ({ ...f, adults: Math.min(room.max_guests, f.adults + 1) }))}
                >+</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Children</Label>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="px-3 py-2 text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => setForm(f => ({ ...f, children: Math.max(0, f.children - 1) }))}
                >−</button>
                <span className="flex-1 text-center text-sm font-semibold py-2">{form.children}</span>
                <button
                  type="button"
                  className="px-3 py-2 text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => setForm(f => ({ ...f, children: f.children + 1 }))}
                >+</button>
              </div>
            </div>
          </div>

          {extraGuests > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{extraGuests} extra guest(s) × ₱{EXTRA_GUEST_FEE}/night = {formatCurrency(extraFee)}</span>
            </div>
          )}

          <Card className="bg-primary/5 border border-primary/20 rounded-xl">
            <CardContent className="p-4 space-y-2 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Price Summary</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{room.name} × {nights} night{nights !== 1 ? 's' : ''}</span>
                <span>{formatCurrency(baseAmount)}</span>
              </div>
              {extraFee > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Extra guest fee</span>
                  <span>+{formatCurrency(extraFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Estimated Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Special Requests <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              rows={3}
              placeholder="Early check-in, extra pillows, ground floor, etc."
              value={form.specialRequests}
              onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-primary" />
              Promo Code <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. KASUBAY10"
                value={form.promoCode}
                onChange={e => setForm(f => ({ ...f, promoCode: e.target.value }))}
                className="uppercase"
              />
              <Button
                variant="outline"
                onClick={applyPromo}
                type="button"
                disabled={promoLoading || !form.promoCode.trim()}
                className="shrink-0"
              >
                {promoLoading ? '…' : 'Apply'}
              </Button>
            </div>
            {promo && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2.5">
                <Sparkles className="h-4 w-4" />
                <span><strong>{promo.code}</strong> — {promo.discount_pct}% off · Saving {formatCurrency(discount)}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">
                  <span className="flex items-center gap-2">💵 Cash on Check-In</span>
                </SelectItem>
                <SelectItem value="GCash">
                  <span className="flex items-center gap-2">📱 GCash</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-1.5">
            <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Updated Summary</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base amount</span>
              <span>{formatCurrency(baseAmount)}</span>
            </div>
            {extraFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Extra guests</span><span>+{formatCurrency(extraFee)}</span></div>}
            {discount > 0 && <div className="flex justify-between text-green-600"><span>Promo discount</span><span>−{formatCurrency(discount)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Juan dela Cruz"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Email Address <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              placeholder="juan@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Phone Number <span className="text-destructive">*</span></Label>
            <Input
              type="tel"
              placeholder="+63 9XX XXX XXXX"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              required
            />
          </div>

          {/* Final summary */}
          <Card className="border border-border/60 rounded-xl">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-sm">
              {[
                { label: 'Room',      value: room.name },
                { label: 'Dates',     value: `${form.checkIn} → ${form.checkOut}` },
                { label: 'Guests',    value: `${form.adults} adult${form.adults > 1 ? 's' : ''}${form.children > 0 ? `, ${form.children} child${form.children > 1 ? 'ren' : ''}` : ''}` },
                { label: 'Nights',    value: nights },
                { label: 'Payment',   value: form.paymentMethod },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ))}
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Promo ({promo.code})</span>
                  <span>−{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2.5">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          <label className="flex items-start gap-3 text-sm cursor-pointer p-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 accent-primary"
              checked={form.agreed}
              onChange={e => setForm(f => ({ ...f, agreed: e.target.checked }))}
            />
            <span className="text-muted-foreground leading-relaxed">
              I agree to the hotel's{' '}
              <span className="text-primary font-medium">payment and cancellation policies</span>.
              Booking is subject to hotel confirmation.
            </span>
          </label>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        {step < 3 ? (
          <Button className="flex-1 font-semibold" onClick={() => setStep(s => s + 1)}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            className="flex-1 font-semibold h-11"
            disabled={loading || !form.name || !form.email || !form.phone || !form.agreed}
            onClick={handleSubmit}
          >
            {loading ? (
              <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> Processing…</span>
            ) : (
              'Confirm Booking'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

export default function Booking() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [filterAvail, setFilterAvail] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [viewRoom, setViewRoom] = useState(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [checkIn, setCheckIn]   = useState(format(new Date(), 'yyyy-MM-dd'))
  const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [guestCount, setGuestCount] = useState(1)
  const [settings, setSettings] = useState({})
  const [viewImgIdx, setViewImgIdx] = useState(0)

  useEffect(() => {
    supabase.from('settings').select('*').single().then(({ data }) => { if (data) setSettings(data) })
    loadRooms()
  }, [])

  async function loadRooms() {
    setLoading(true)
    const { data: roomData }    = await supabase.from('rooms').select('*').eq('is_active', true)
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('room_id, check_in, check_out')
      .in('status', ['Pending', 'Confirmed', 'Checked In'])

    const selectedCheckIn = checkIn
    const selectedCheckOut = checkOut
    const roomsWithAvail = (roomData || []).map(room => {
      const occupied = (bookingData || []).filter(b =>
        b.room_id === room.id &&
        b.check_in < selectedCheckOut &&
        b.check_out > selectedCheckIn
      ).length
      return { ...room, available: occupied < room.quantity }
    })
    setRooms(roomsWithAvail)
    setLoading(false)
  }

  const nights = calculateNights(checkIn, checkOut)

  const filtered = rooms
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .filter(r => (r.max_guests || 0) >= guestCount)
    .filter(r => filterAvail === 'all' ? true : filterAvail === 'available' ? r.available : !r.available)
    .sort((a, b) => {
      if (sortBy === 'price_asc')  return a.price - b.price
      if (sortBy === 'price_desc') return b.price - a.price
      return 0
    })

  const regularRooms = filtered.filter(r => r.tag !== 'event')
  const eventRooms   = filtered.filter(r => r.tag === 'event')
  const availCount   = rooms.filter(r => r.available).length

  const viewImages = viewRoom?.images?.length
    ? viewRoom.images
    : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-border/60 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/image/UALogo.png"
              alt="UA Logo"
              className="h-9 w-9 rounded-xl object-cover group-hover:scale-105 transition-transform"
            />
            <span className="font-bold text-sm">{settings.hotel_name || 'Kasubay UA-TLMC Hotel'}</span>
          </Link>
          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 text-green-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
              {availCount} room{availCount !== 1 ? 's' : ''} available
            </span>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Search hero — Agoda-style ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-1.5">Find Your Perfect Room</h1>
          <p className="text-slate-300 text-sm mb-7">
            {rooms.length > 0 && `${availCount} of ${rooms.length} rooms available`}
          </p>

          {/* Search bar */}
          <div className="bg-white rounded-2xl p-2 shadow-2xl border border-white/10">
            <div className="flex flex-wrap md:flex-nowrap gap-1 items-stretch">
              <div className="flex-1 min-w-[120px] flex flex-col px-3 py-2 text-left border-r border-gray-100 last:border-0">
                <label className="text-xs text-gray-400 font-medium mb-0.5">Check-In</label>
                <input
                  type="date"
                  value={checkIn}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setCheckIn(e.target.value)}
                  className="text-gray-900 text-sm font-semibold outline-none bg-transparent"
                />
              </div>
              <div className="flex-1 min-w-[120px] flex flex-col px-3 py-2 text-left border-r border-gray-100">
                <label className="text-xs text-gray-400 font-medium mb-0.5">Check-Out</label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn}
                  onChange={e => setCheckOut(e.target.value)}
                  className="text-gray-900 text-sm font-semibold outline-none bg-transparent"
                />
              </div>
              <div className="w-28 flex flex-col px-3 py-2 text-left border-r border-gray-100">
                <label className="text-xs text-gray-400 font-medium mb-0.5">Guests</label>
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="number"
                    min={1}
                    value={guestCount}
                    onChange={e => setGuestCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full text-gray-900 text-sm font-semibold outline-none bg-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center px-1">
                <Button onClick={loadRooms} className="h-full px-6 rounded-xl font-semibold text-sm" size="sm">
                  <Search className="h-4 w-4 mr-2" />Check Availability
                </Button>
              </div>
            </div>
          </div>

          {nights > 0 && (
            <p className="text-slate-400 text-xs mt-3">
              {nights} night{nights !== 1 ? 's' : ''} · Prices shown per night
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-white rounded-xl p-3 border border-border/60 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms…"
              className="pl-9 border-0 bg-gray-50 focus-visible:ring-1"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {[
              { value: 'all',       label: 'All Rooms' },
              { value: 'available', label: 'Available' },
              { value: 'full',      label: 'Fully Booked' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterAvail(value)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filterAvail === value
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-muted-foreground border-border hover:border-primary hover:text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 border-0 bg-gray-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-border/60 overflow-hidden animate-pulse">
                <div className="h-52 bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {regularRooms.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold">Hotel Rooms</h2>
                  <span className="text-sm text-muted-foreground">{regularRooms.length} room{regularRooms.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularRooms.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onBook={r => { setSelectedRoom(r); setBookingOpen(true) }}
                      onView={r => { setViewRoom(r); setViewImgIdx(0) }}
                    />
                  ))}
                </div>
              </section>
            )}

            {eventRooms.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold">Event Halls</h2>
                  <span className="text-sm text-muted-foreground">{eventRooms.length} hall{eventRooms.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  {eventRooms.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onBook={r => { setSelectedRoom(r); setBookingOpen(true) }}
                      onView={r => { setViewRoom(r); setViewImgIdx(0) }}
                    />
                  ))}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-24 bg-white rounded-2xl border border-border/60">
                <BedDouble className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                <p className="font-semibold text-lg mb-1">No rooms found</p>
                <p className="text-muted-foreground text-sm">Try adjusting your search or filters.</p>
                <Button variant="outline" className="mt-5" onClick={() => { setSearch(''); setFilterAvail('all') }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </>
        )}

        {/* ── Trust badges ── */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Shield, label: 'Secure Booking',    desc: 'Your data is protected' },
            { icon: Clock,  label: 'Instant Confirmation', desc: 'Get confirmed right away' },
            { icon: Star,   label: 'Best Price',         desc: 'No hidden charges' },
            { icon: Users,  label: 'Friendly Staff',     desc: '24/7 guest support' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 bg-white rounded-xl p-4 border border-border/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Room Detail Modal ── */}
      <Dialog open={!!viewRoom} onOpenChange={() => setViewRoom(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          {viewRoom && (
            <>
              {/* Image gallery */}
              <div className="relative h-64 overflow-hidden rounded-t-2xl bg-black">
                <img
                  src={viewImages[viewImgIdx]}
                  alt={viewRoom.name}
                  className="h-full w-full object-cover"
                />
                {viewImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setViewImgIdx(i => (i - 1 + viewImages.length) % viewImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewImgIdx(i => (i + 1) % viewImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {viewImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setViewImgIdx(i)}
                          className={`rounded-full transition-all ${i === viewImgIdx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <Badge className={viewRoom.available ? 'bg-green-500 text-white border-0' : 'bg-red-500 text-white border-0'}>
                    {viewRoom.available ? 'Available' : 'Fully Booked'}
                  </Badge>
                </div>
              </div>

              <div className="p-5 space-y-5">
                <DialogHeader>
                  <DialogTitle className="text-xl">{viewRoom.name}</DialogTitle>
                </DialogHeader>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-primary">{formatCurrency(viewRoom.price)}</span>
                      <span className="text-sm text-muted-foreground">/night</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" />{viewRoom.capacity} bed{viewRoom.capacity > 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1"><Users className="h-4 w-4" />Up to {viewRoom.max_guests} guests</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-amber-700">4.8</span>
                  </div>
                </div>

                {viewRoom.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{viewRoom.description}</p>
                )}

                <div>
                  <h4 className="font-semibold text-sm mb-3">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {(viewRoom.amenities || []).map(a => (
                      <span key={a} className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1.5 rounded-full">
                        {amenityIcon(a)}{a}
                      </span>
                    ))}
                    {(!viewRoom.amenities || viewRoom.amenities.length === 0) && (
                      <span className="text-sm text-muted-foreground">No amenities listed</span>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full h-11 font-semibold rounded-xl"
                  disabled={!viewRoom.available}
                  onClick={() => {
                    setSelectedRoom(viewRoom)
                    setViewRoom(null)
                    setBookingOpen(true)
                  }}
                >
                  {viewRoom.available ? 'Book This Room' : 'Currently Unavailable'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Booking Modal ── */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl">
          {selectedRoom && (
            <>
              {/* Room mini-header */}
              <div className="flex items-center gap-3 pb-4 mb-1 border-b border-border/60">
                <img
                  src={selectedRoom.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=120&q=70'}
                  alt={selectedRoom.name}
                  className="h-14 w-20 rounded-xl object-cover shrink-0"
                />
                <div>
                  <p className="font-bold text-base">{selectedRoom.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <span className="text-primary font-semibold">{formatCurrency(selectedRoom.price)}</span>
                    <span>/night</span>
                  </p>
                </div>
              </div>

              <BookingWizard
                room={selectedRoom}
                checkIn={checkIn}
                checkOut={checkOut}
                onClose={() => { setBookingOpen(false); setSelectedRoom(null) }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
