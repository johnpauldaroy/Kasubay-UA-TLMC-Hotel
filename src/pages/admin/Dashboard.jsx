import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, calculateRetentionMetrics } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, CalendarDays, TrendingUp, Clock, Repeat, Percent, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { getStatusColor } from '@/lib/utils'

export default function Dashboard() {
  const [stats, setStats] = useState({ guests: 0, bookings: 0, revenue: 0, pending: 0 })
  const [retention, setRetention] = useState({ repeatGuests: 0, rebookingRate: 0, cancellationRate: 0 })
  const [recentBookings, setRecentBookings] = useState([])
  const [monthlyRevenue, setMonthlyRevenue] = useState([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const [{ count: guestCount }, { data: bookings }] = await Promise.all([
      supabase.from('guests').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
    ])

    const allBookings = bookings || []
    const totalRevenue = allBookings
      .filter(b => b.status !== 'Cancelled')
      .reduce((s, b) => s + (b.total_amount || 0), 0)
    const pending = allBookings.filter(b => b.status === 'Pending').length
    const retentionMetrics = calculateRetentionMetrics(allBookings)

    setStats({ guests: guestCount || 0, bookings: allBookings.length, revenue: totalRevenue, pending })
    setRetention({
      repeatGuests: retentionMetrics.repeatGuests,
      rebookingRate: retentionMetrics.rebookingRate,
      cancellationRate: retentionMetrics.cancellationRate,
    })
    setRecentBookings(allBookings.slice(0, 8))

    // Build monthly revenue for last 6 months
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i)
      return {
        name: format(d, 'MMM'),
        start: format(startOfMonth(d), 'yyyy-MM-dd'),
        end: format(endOfMonth(d), 'yyyy-MM-dd'),
        total: 0,
      }
    })
    months.forEach(m => {
      m.total = allBookings
        .filter(b => b.status !== 'Cancelled' && b.created_at >= m.start && b.created_at <= m.end + 'T23:59:59')
        .reduce((s, b) => s + (b.total_amount || 0), 0)
    })
    setMonthlyRevenue(months)
  }

  const statCards = [
    { title: 'Total Guests', value: stats.guests, icon: Users, color: 'text-blue-500' },
    { title: 'Total Bookings', value: stats.bookings, icon: CalendarDays, color: 'text-green-500' },
    { title: 'Total Revenue', value: formatCurrency(stats.revenue), icon: TrendingUp, color: 'text-primary' },
    { title: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-500' },
    { title: 'Repeat Guests', value: retention.repeatGuests, icon: Repeat, color: 'text-indigo-500' },
    { title: 'Rebooking Rate', value: `${retention.rebookingRate.toFixed(1)}%`, icon: Percent, color: 'text-emerald-500' },
    { title: 'Cancellation Rate', value: `${retention.cancellationRate.toFixed(1)}%`, icon: XCircle, color: 'text-rose-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of hotel operations</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statCards.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardContent className="p-5 h-full">
              <div className="flex items-start justify-between min-h-[52px]">
                <p className="text-sm text-muted-foreground leading-6">{title}</p>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="mt-3 text-2xl font-bold leading-none">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} className="text-xs" />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Today', filter: (b) => b.created_at?.startsWith(format(new Date(), 'yyyy-MM-dd')) },
              { label: 'This Week', filter: (b) => {
                const d = new Date(b.created_at); const now = new Date()
                const diff = (now - d) / 86400000; return diff <= 7
              }},
              { label: 'This Month', filter: (b) => b.created_at?.startsWith(format(new Date(), 'yyyy-MM')) },
            ].map(({ label, filter }) => {
              const total = recentBookings
                .filter(b => b.status !== 'Cancelled' && filter(b))
                .reduce((s, b) => s + (b.total_amount || 0), 0)
              return (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="font-semibold text-sm">{formatCurrency(total)}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent bookings */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Bookings</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBookings.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs text-primary">{b.transaction_code}</TableCell>
                  <TableCell className="font-medium text-sm">{b.guest_name}</TableCell>
                  <TableCell className="text-sm">{b.room_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{b.check_in} → {b.check_out}</TableCell>
                  <TableCell className="font-semibold text-sm">{formatCurrency(b.total_amount)}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(b.status)} border-0 text-xs`}>{b.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recentBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bookings yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
