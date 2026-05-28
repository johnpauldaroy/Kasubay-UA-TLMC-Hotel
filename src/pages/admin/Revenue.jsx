import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, calculateRetentionMetrics } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Repeat, Percent, XCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { getStatusColor } from '@/lib/utils'

const COLORS = ['hsl(43,78%,48%)', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6']

export default function Revenue() {
  const [bookings, setBookings] = useState([])
  const [period, setPeriod] = useState('month')

  useEffect(() => {
    supabase.from('bookings').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setBookings(data || []))
  }, [])

  function inPeriod(b) {
    const d = new Date(b.created_at)
    const now = new Date()
    if (period === 'today') return b.created_at?.startsWith(format(now, 'yyyy-MM-dd'))
    if (period === 'week') return (now - d) / 86400000 <= 7
    if (period === 'month') return b.created_at?.startsWith(format(now, 'yyyy-MM'))
    if (period === 'year') return b.created_at?.startsWith(format(now, 'yyyy'))
    return true
  }

  const periodBookings = bookings.filter(inPeriod)
  const activePeriodBookings = periodBookings.filter(b => b.status !== 'Cancelled')
  const retention = calculateRetentionMetrics(periodBookings)
  const totalRevenue = activePeriodBookings.reduce((s, b) => s + (b.total_amount || 0), 0)
  const totalBookings = periodBookings.length

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    const start = format(startOfMonth(d), 'yyyy-MM-dd')
    const end = format(endOfMonth(d), 'yyyy-MM-dd')
    const total = bookings
      .filter(b => b.status !== 'Cancelled' && b.created_at >= start && b.created_at <= `${end}T23:59:59`)
      .reduce((s, b) => s + (b.total_amount || 0), 0)
    return { name: format(d, 'MMM'), total }
  })

  const byRoom = Object.values(
    bookings.reduce((acc, b) => {
      if (b.status === 'Cancelled') return acc
      acc[b.room_name] = acc[b.room_name] || { name: b.room_name, value: 0 }
      acc[b.room_name].value += b.total_amount || 0
      return acc
    }, {})
  ).sort((a, b) => b.value - a.value)

  const byPayment = Object.values(
    bookings.reduce((acc, b) => {
      if (b.status === 'Cancelled') return acc
      acc[b.payment_method] = acc[b.payment_method] || { name: b.payment_method, value: 0 }
      acc[b.payment_method].value += b.total_amount || 0
      return acc
    }, {})
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue & Income</h1>
          <p className="text-muted-foreground text-sm">Financial overview</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-primary' },
          { label: 'Bookings', value: totalBookings, icon: CreditCard, color: 'text-blue-500' },
          { label: 'Avg per Booking', value: activePeriodBookings.length ? formatCurrency(totalRevenue / activePeriodBookings.length) : '-', icon: TrendingUp, color: 'text-green-500' },
          { label: 'Cash vs GCash', value: `${activePeriodBookings.filter(b => b.payment_method === 'Cash').length} / ${activePeriodBookings.filter(b => b.payment_method === 'GCash').length}`, icon: TrendingDown, color: 'text-purple-500' },
          { label: 'Repeat Guests', value: retention.repeatGuests, icon: Repeat, color: 'text-indigo-500' },
          { label: 'Rebooking Rate', value: `${retention.rebookingRate.toFixed(1)}%`, icon: Percent, color: 'text-emerald-500' },
          { label: 'Cancellation Rate', value: `${retention.cancellationRate.toFixed(1)}%`, icon: XCircle, color: 'text-rose-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Monthly Revenue (Last 6 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis tickFormatter={v => `P${(v / 1000).toFixed(0)}k`} className="text-xs" />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">By Payment Method</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byPayment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue by Room</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {byRoom.map(({ name, value }) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-32 text-sm truncate font-medium">{name}</div>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${byRoom[0].value ? (value / byRoom[0].value) * 100 : 0}%` }} />
                </div>
                <div className="text-sm font-semibold w-24 text-right">{formatCurrency(value)}</div>
              </div>
            ))}
            {byRoom.length === 0 && <p className="text-sm text-muted-foreground">No data</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Transactions ({periodBookings.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodBookings.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.created_at ? format(new Date(b.created_at), 'MMM d') : '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-primary">{b.transaction_code}</TableCell>
                  <TableCell className="text-sm">{b.guest_name}</TableCell>
                  <TableCell className="text-sm">{b.room_name}</TableCell>
                  <TableCell className="text-sm">{b.payment_method}</TableCell>
                  <TableCell className="font-semibold text-sm">{formatCurrency(b.total_amount)}</TableCell>
                  <TableCell><Badge className={`${getStatusColor(b.status)} border-0 text-xs`}>{b.status}</Badge></TableCell>
                </TableRow>
              ))}
              {periodBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">No transactions in this period</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
