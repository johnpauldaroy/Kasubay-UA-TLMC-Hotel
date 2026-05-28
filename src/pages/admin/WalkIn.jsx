import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, generateTransactionCode, calculateNights, getStatusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, DoorOpen, Search } from 'lucide-react'
import { format, addDays } from 'date-fns'

const emptyForm = {
  guest_name: '', guest_email: '', guest_phone: '',
  room_id: '', check_in: format(new Date(), 'yyyy-MM-dd'),
  check_out: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  adults: 1, children: 0, payment_method: 'Cash',
  special_requests: '', received_by: '', id_type: '', id_number: '', notes: '',
}

export default function WalkIn() {
  const [bookings, setBookings] = useState([])
  const [rooms, setRooms] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: bookingData }, { data: roomData }] = await Promise.all([
      supabase.from('bookings').select('*').eq('booking_type', 'walk_in').order('created_at', { ascending: false }),
      supabase.from('rooms').select('id,name,price,max_guests').eq('is_active', true),
    ])
    setBookings(bookingData || [])
    setRooms(roomData || [])
  }

  async function handleSubmit() {
    setLoading(true)
    const txCode = generateTransactionCode()
    const selectedRoom = rooms.find(r => r.id === form.room_id)
    if (!selectedRoom) { toast({ title: 'Please select a room', variant: 'destructive' }); setLoading(false); return }

    const nights = calculateNights(form.check_in, form.check_out)
    const total_amount = selectedRoom.price * nights

    // upsert guest
    let guestId = null
    if (form.guest_email) {
      const { data: existing } = await supabase.from('guests').select('id').eq('email', form.guest_email).single()
      if (existing) { guestId = existing.id }
      else {
        const { data: ng } = await supabase.from('guests')
          .insert([{ name: form.guest_name, email: form.guest_email, phone: form.guest_phone }])
          .select('id').single()
        if (ng) guestId = ng.id
      }
    }

    const { data: booking, error } = await supabase.from('bookings').insert([{
      transaction_code: txCode,
      guest_id: guestId,
      guest_name: form.guest_name,
      guest_email: form.guest_email,
      guest_phone: form.guest_phone,
      room_id: form.room_id,
      room_name: selectedRoom.name,
      check_in: form.check_in,
      check_out: form.check_out,
      adults: form.adults,
      children: form.children,
      total_guests: form.adults + form.children,
      base_amount: total_amount,
      total_amount,
      payment_method: form.payment_method,
      special_requests: form.special_requests,
      status: 'Confirmed',
      booking_type: 'walk_in',
    }]).select().single()

    if (!error && booking) {
      await supabase.from('walk_ins').insert([{
        booking_id: booking.id,
        received_by: form.received_by,
        id_type: form.id_type,
        id_number: form.id_number,
        notes: form.notes,
      }])
    }

    setLoading(false)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: `Walk-in booked! Code: ${txCode}` }); setOpen(false); setForm(emptyForm); loadData() }
  }

  const selectedRoom = rooms.find(r => r.id === form.room_id)
  const nights = calculateNights(form.check_in, form.check_out)
  const estimated = selectedRoom ? selectedRoom.price * nights : 0

  const filtered = bookings.filter(b =>
    b.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.transaction_code?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Walk-In Guests</h1>
          <p className="text-muted-foreground text-sm">Manage on-site check-ins</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> New Walk-In
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check-In</TableHead>
                <TableHead>Check-Out</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs text-primary">{b.transaction_code}</TableCell>
                  <TableCell className="font-medium text-sm">{b.guest_name}</TableCell>
                  <TableCell className="text-sm">{b.room_name}</TableCell>
                  <TableCell className="text-sm">{b.check_in}</TableCell>
                  <TableCell className="text-sm">{b.check_out}</TableCell>
                  <TableCell className="font-semibold text-sm">{formatCurrency(b.total_amount)}</TableCell>
                  <TableCell><Badge className={`${getStatusColor(b.status)} border-0 text-xs`}>{b.status}</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">No walk-in records</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Walk-In Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Guest Name *</Label>
                <Input value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.guest_email} onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.guest_phone} onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Room *</Label>
              <Select value={form.room_id} onValueChange={v => setForm(f => ({ ...f, room_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select room…" /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name} — {formatCurrency(r.price)}/night</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-In</Label>
                <Input type="date" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Check-Out</Label>
                <Input type="date" value={form.check_out} min={form.check_in} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Adults</Label>
                <Input type="number" min={1} value={form.adults} onChange={e => setForm(f => ({ ...f, adults: +e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Children</Label>
                <Input type="number" min={0} value={form.children} onChange={e => setForm(f => ({ ...f, children: +e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="GCash">GCash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-semibold text-muted-foreground">Reception Info</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Received By</Label>
                  <Input value={form.received_by} onChange={e => setForm(f => ({ ...f, received_by: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>ID Type</Label>
                  <Input placeholder="Passport, Driver's License…" value={form.id_type} onChange={e => setForm(f => ({ ...f, id_type: e.target.value }))} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>ID Number</Label>
                  <Input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {selectedRoom && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 text-sm flex justify-between">
                  <span className="text-muted-foreground">{selectedRoom.name} × {nights} night{nights > 1 ? 's' : ''}</span>
                  <span className="font-bold text-primary">{formatCurrency(estimated)}</span>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !form.guest_name || !form.room_id}>
              {loading ? 'Processing…' : 'Confirm Walk-In'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
