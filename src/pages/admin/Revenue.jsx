import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { formatCurrency, calculateRetentionMetrics } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Repeat, Percent, XCircle, Download, FileText, FileSpreadsheet } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { getStatusColor } from '@/lib/utils'

const COLORS = ['hsl(43,78%,48%)', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6']
const PERIOD_LABELS = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time',
}

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

  const periodLabel = PERIOD_LABELS[period] || 'Revenue'
  const exportFileName = `revenue-${period}-${format(new Date(), 'yyyy-MM-dd')}`

  function buildTransactionRows() {
    return periodBookings.map(b => ({
      Date: b.created_at ? format(new Date(b.created_at), 'yyyy-MM-dd') : '',
      'Transaction Code': b.transaction_code || '',
      'Guest Name': b.guest_name || '',
      Room: b.room_name || '',
      'Payment Method': b.payment_method || '',
      Amount: Number(b.total_amount) || 0,
      Status: b.status || '',
    }))
  }

  function buildSummaryRows() {
    return [
      { Metric: 'Period', Value: periodLabel },
      { Metric: 'Generated Date', Value: format(new Date(), 'yyyy-MM-dd HH:mm') },
      { Metric: 'Total Revenue', Value: totalRevenue },
      { Metric: 'Bookings', Value: totalBookings },
      { Metric: 'Average per Booking', Value: activePeriodBookings.length ? totalRevenue / activePeriodBookings.length : 0 },
      { Metric: 'Cash Bookings', Value: activePeriodBookings.filter(b => b.payment_method === 'Cash').length },
      { Metric: 'GCash Bookings', Value: activePeriodBookings.filter(b => b.payment_method === 'GCash').length },
      { Metric: 'Repeat Guests', Value: retention.repeatGuests },
      { Metric: 'Rebooking Rate', Value: `${retention.rebookingRate.toFixed(1)}%` },
      { Metric: 'Cancellation Rate', Value: `${retention.cancellationRate.toFixed(1)}%` },
    ]
  }

  function exportCSV() {
    const ws = XLSX.utils.json_to_sheet(buildTransactionRows())
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFileName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSummaryRows()), 'Summary')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildTransactionRows()), 'Transactions')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthly.map(row => ({
      Month: row.name,
      Revenue: row.total,
    }))), 'Monthly Revenue')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byRoom.map(row => ({
      Room: row.name || 'Unknown',
      Revenue: row.value,
    }))), 'Revenue by Room')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byPayment.map(row => ({
      'Payment Method': row.name || 'Unknown',
      Revenue: row.value,
    }))), 'Payment Method')
    XLSX.writeFile(wb, `${exportFileName}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue & Income</h1>
          <p className="text-muted-foreground text-sm">Financial overview</p>
        </div>
        <div className="flex items-center gap-2">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Export as Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-blue-600" />
                Export as CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
