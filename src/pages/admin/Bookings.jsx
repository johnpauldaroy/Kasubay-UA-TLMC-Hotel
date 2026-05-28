import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getStatusColor } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Eye, Printer, Mail, CheckCircle2, LogOut } from 'lucide-react'
import { format } from 'date-fns'

const STATUSES = ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled']

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// Calls the Supabase Edge Function to send transactional email
async function triggerEmail(type, booking) {
  if (!booking.guest_email) return { skipped: true }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, booking }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return data
  } catch (err) {
    console.error('Email trigger failed:', err)
    return { error: err.message }
  }
}

function StatusBadge({ status }) {
  const colors = {
    Confirmed:    'bg-blue-100 text-blue-700 border-blue-200',
    'Checked In': 'bg-green-100 text-green-700 border-green-200',
    'Checked Out':'bg-slate-100 text-slate-600 border-slate-200',
    Cancelled:    'bg-red-100 text-red-700 border-red-200',
    Pending:      'bg-amber-100 text-amber-700 border-amber-200',
  }
  return (
    <Badge className={`text-xs font-medium border ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </Badge>
  )
}

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [editStatus, setEditStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const { toast } = useToast()

  useEffect(() => { loadBookings() }, [])

  async function loadBookings() {
    const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false })
    setBookings(data || [])
  }

  async function updateStatus() {
    setLoading(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: editStatus })
      .eq('id', selected.id)
    setLoading(false)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }

    toast({ title: 'Status updated', description: `Booking marked as ${editStatus}` })

    // Send email notifications on key status transitions
    if (editStatus === 'Confirmed' && selected.guest_email) {
      setEmailSending(true)
      const result = await triggerEmail('confirmed', { ...selected, status: editStatus })
      setEmailSending(false)
      if (result?.ok) {
        toast({ title: '📧 Confirmation email sent', description: `Sent to ${selected.guest_email}` })
      } else if (result?.skipped) {
        toast({ title: 'No email on file', description: 'Guest did not provide an email address.' })
      } else if (result?.error) {
        toast({ title: 'Email failed to send', description: result.error, variant: 'destructive' })
      }
    }

    if (editStatus === 'Checked Out' && selected.guest_email) {
      setEmailSending(true)
      const result = await triggerEmail('checked_out', { ...selected, status: editStatus })
      setEmailSending(false)
      if (result?.ok) {
        toast({ title: '📧 Checkout & feedback email sent', description: `Sent to ${selected.guest_email}` })
      } else if (result?.error) {
        toast({ title: 'Email failed to send', description: result.error, variant: 'destructive' })
      }
    }

    setSelected(null)
    loadBookings()
  }

  // Quick-action: resend confirmation email manually
  async function resendEmail(type) {
    if (!selected?.guest_email) {
      toast({ title: 'No email on file', variant: 'destructive' })
      return
    }
    setEmailSending(true)
    const result = await triggerEmail(type, selected)
    setEmailSending(false)
    if (result?.ok) {
      toast({ title: '📧 Email resent', description: `Sent to ${selected.guest_email}` })
    } else {
      toast({ title: 'Failed to resend', description: result?.error ?? 'Unknown error', variant: 'destructive' })
    }
  }

  const filtered = bookings
    .filter(b => statusFilter === 'all' || b.status === statusFilter)
    .filter(b =>
      b.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.transaction_code?.toLowerCase().includes(search.toLowerCase()) ||
      b.room_name?.toLowerCase().includes(search.toLowerCase())
    )

  const nights = selected
    ? Math.round((new Date(selected.check_out) - new Date(selected.check_in)) / 86400000)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground text-sm">{bookings.length} total bookings</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by guest, code, or room…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
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
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell className="text-sm">{b.payment_method}</TableCell>
                  <TableCell><StatusBadge status={b.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setSelected(b); setEditStatus(b.status) }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">No bookings found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Booking Detail & Status Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Booking Details
                  <StatusBadge status={selected.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                {/* Transaction code highlight */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Transaction Code</p>
                  <p className="font-mono text-xl font-bold text-primary tracking-widest">{selected.transaction_code}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    ['Guest Name',   selected.guest_name],
                    ['Email',        selected.guest_email || '—'],
                    ['Phone',        selected.guest_phone || '—'],
                    ['Room',         selected.room_name],
                    ['Check-In',     selected.check_in],
                    ['Check-Out',    selected.check_out],
                    ['Nights',       nights],
                    ['Adults',       selected.adults],
                    ['Children',     selected.children ?? 0],
                    ['Payment',      selected.payment_method],
                    ['Promo Code',   selected.promo_code || '—'],
                    ['Discount',     selected.discount ? formatCurrency(selected.discount) : '—'],
                    ['Base Amount',  formatCurrency(selected.base_amount)],
                    ['Booking Type', selected.booking_type || 'Online'],
                    ['Created',      selected.created_at ? format(new Date(selected.created_at), 'MMM d, yyyy h:mm a') : '—'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="font-medium">{val}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center bg-muted/50 rounded-xl p-3 font-bold text-base">
                  <span>Total Amount</span>
                  <span className="text-primary text-lg">{formatCurrency(selected.total_amount)}</span>
                </div>

                {selected.special_requests && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Special Requests</p>
                    <p className="text-sm text-amber-900">{selected.special_requests}</p>
                  </div>
                )}

                {/* Email quick-actions */}
                {selected.guest_email && (
                  <div className="border border-border/60 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Actions</p>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs"
                        disabled={emailSending}
                        onClick={() => resendEmail('confirmed')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        Resend Confirmation
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs"
                        disabled={emailSending}
                        onClick={() => resendEmail('checked_out')}
                      >
                        <LogOut className="h-3.5 w-3.5 text-blue-600" />
                        Send Feedback Request
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Sending to: {selected.guest_email}</p>
                  </div>
                )}

                {/* Status update */}
                <div className="space-y-2 pt-1">
                  <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Update Status</p>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {editStatus === 'Confirmed' && selected.guest_email && (
                    <p className="text-xs text-green-700 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> A confirmation email will be sent to {selected.guest_email}
                    </p>
                  )}
                  {editStatus === 'Checked Out' && selected.guest_email && (
                    <p className="text-xs text-blue-700 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> A checkout + feedback email will be sent to {selected.guest_email}
                    </p>
                  )}
                  {!selected.guest_email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> No email on file — notifications skipped
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />Print
                </Button>
                <Button
                  onClick={updateStatus}
                  disabled={loading || emailSending || editStatus === selected.status}
                >
                  {loading ? 'Saving…' : emailSending ? 'Sending email…' : 'Save Status'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
