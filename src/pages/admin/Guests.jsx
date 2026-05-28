import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Users, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

export default function Guests() {
  const [guests, setGuests] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [guestBookings, setGuestBookings] = useState([])
  const { toast } = useToast()

  useEffect(() => { loadGuests() }, [])

  async function loadGuests() {
    const { data } = await supabase.from('guests').select('*').order('created_at', { ascending: false })
    setGuests(data || [])
  }

  async function viewGuest(guest) {
    setSelected(guest)
    const { data } = await supabase.from('bookings').select('*').eq('guest_id', guest.id).order('created_at', { ascending: false })
    setGuestBookings(data || [])
  }

  async function deleteGuest(id) {
    if (!confirm('Delete this guest? Their bookings will not be deleted.')) return
    const { error } = await supabase.from('guests').delete().eq('id', id)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Guest deleted' }); loadGuests() }
  }

  const filtered = guests.filter(g =>
    g.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.email?.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Guests</h1>
          <p className="text-muted-foreground text-sm">{guests.length} registered guests</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search guests…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{g.email || '—'}</TableCell>
                  <TableCell className="text-sm">{g.phone || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.created_at ? format(new Date(g.created_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => viewGuest(g)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteGuest(g.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    {search ? 'No guests match your search' : 'No guests yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setGuestBookings([]) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Email</p><p>{selected.email || '—'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Phone</p><p>{selected.phone || '—'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Address</p><p>{selected.address || '—'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Since</p>
                    <p>{selected.created_at ? format(new Date(selected.created_at), 'MMMM d, yyyy') : '—'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Booking History ({guestBookings.length})</h4>
                  {guestBookings.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {guestBookings.map(b => (
                          <TableRow key={b.id}>
                            <TableCell className="font-mono text-xs text-primary">{b.transaction_code}</TableCell>
                            <TableCell className="text-sm">{b.room_name}</TableCell>
                            <TableCell className="text-xs">{b.check_in} → {b.check_out}</TableCell>
                            <TableCell className="text-sm font-semibold">{formatCurrency(b.total_amount)}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs border-0 font-medium ${
                                b.status === 'Confirmed'   ? 'bg-blue-100 text-blue-700' :
                                b.status === 'Checked In'  ? 'bg-green-100 text-green-700' :
                                b.status === 'Checked Out' ? 'bg-slate-100 text-slate-600' :
                                b.status === 'Cancelled'   ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>{b.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No bookings found.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
