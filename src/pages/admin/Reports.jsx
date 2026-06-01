import { useEffect, useMemo, useState } from 'react'
import { format, addMonths, startOfMonth } from 'date-fns'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { BedDouble, MessageSquareText, Printer, Star, Users, Download, FileText, FileSpreadsheet } from 'lucide-react'

const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','been','but','by','can','could','did','do','does','for','from','had','has','have','he','her','hers','him','his','how','i','if','in','into','is','it','its','just','me','more','my','no','not','of','on','or','our','ours','out','please','really','so','than','that','the','their','theirs','them','then','there','they','this','to','too','us','very','was','we','were','what','when','where','which','who','will','with','you','your','yours',
  // common taglish fillers
  'nga','po','naman','lang','din','rin','yung','yun','sya','siya','kasi',
])

function monthRange(yyyyMm) {
  const start = `${yyyyMm}-01`
  const startDate = startOfMonth(new Date(`${start}T00:00:00`))
  const endDate = addMonths(startDate, 1)
  return {
    startDate,
    endDate,
    startStr: format(startDate, 'yyyy-MM-dd'),
    endStr: format(endDate, 'yyyy-MM-dd'),
    startIso: format(startDate, "yyyy-MM-dd'T'00:00:00"),
    endIso: format(endDate, "yyyy-MM-dd'T'00:00:00"),
  }
}

function buildTopKeywords(messages = []) {
  const counts = new Map()
  for (const msg of messages) {
    const words = String(msg || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter(w => w.length >= 3)
      .filter(w => !STOPWORDS.has(w))
    for (const w of words) counts.set(w, (counts.get(w) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({ word, count }))
}

export default function Reports() {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(false)
  const [bookings, setBookings] = useState([])
  const [feedbacks, setFeedbacks] = useState([])

  const range = useMemo(() => monthRange(month), [month])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: bookingsData }, { data: feedbackData }] = await Promise.all([
        supabase
          .from('bookings')
          .select('id,transaction_code,guest_id,guest_name,guest_email,room_id,room_name,check_in,check_out,adults,children,total_guests,status,created_at')
          .eq('status', 'Checked Out')
          .gte('check_out', range.startStr)
          .lt('check_out', range.endStr)
          .order('check_out', { ascending: true }),
        supabase
          .from('feedbacks')
          .select('id,name,email,message,rating,transaction_code,created_at')
          .gte('created_at', range.startIso)
          .lt('created_at', range.endIso)
          .order('created_at', { ascending: false }),
      ])

      if (cancelled) return
      setBookings(bookingsData || [])
      setFeedbacks(feedbackData || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [range.endIso, range.endStr, range.startIso, range.startStr])

  const guestKeys = useMemo(() => {
    const keys = new Set()
    for (const b of bookings) {
      const key =
        b.guest_id ||
        b.guest_email?.toLowerCase()?.trim() ||
        b.guest_name?.toLowerCase()?.trim()
      if (key) keys.add(key)
    }
    return keys
  }, [bookings])

  const totalGuests = useMemo(() => (
    bookings.reduce((s, b) => s + (b.total_guests || ((b.adults || 0) + (b.children || 0))), 0)
  ), [bookings])

  const roomsMostUsed = useMemo(() => {
    const counts = bookings.reduce((acc, b) => {
      const key = b.room_name || 'Unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [bookings])

  const feedbackStats = useMemo(() => {
    const total = feedbacks.length
    const avg = total
      ? feedbacks.reduce((s, f) => s + (Number(f.rating) || 0), 0) / total
      : 0
    const byRating = feedbacks.reduce((acc, f) => {
      const r = Number(f.rating) || 0
      acc[r] = (acc[r] || 0) + 1
      return acc
    }, {})
    const topKeywords = buildTopKeywords(feedbacks.map(f => f.message))
    const best = [...feedbacks].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)).slice(0, 3)
    const worst = [...feedbacks].sort((a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0)).slice(0, 3)
    return { total, avg, byRating, topKeywords, best, worst }
  }, [feedbacks])

  const monthLabel = format(range.startDate, 'MMMM yyyy')

  function buildExportRows() {
    const bookingRows = bookings.map(b => ({
      Type: 'Booking',
      'Transaction Code': b.transaction_code || '',
      'Guest Name': b.guest_name || '',
      'Guest Email': b.guest_email || '',
      Room: b.room_name || '',
      'Check-In': b.check_in || '',
      'Check-Out': b.check_out || '',
      Adults: b.adults || 0,
      Children: b.children || 0,
      'Total Guests': b.total_guests || ((b.adults || 0) + (b.children || 0)),
      Status: b.status || '',
    }))
    const feedbackRows = feedbacks.map(f => ({
      Type: 'Feedback',
      'Transaction Code': f.transaction_code || '',
      'Guest Name': f.name || '',
      'Guest Email': f.email || '',
      Rating: f.rating || '',
      Comment: f.message || '',
      Date: f.created_at ? format(new Date(f.created_at), 'yyyy-MM-dd') : '',
    }))
    return { bookingRows, feedbackRows }
  }

  function exportCSV() {
    const { bookingRows, feedbackRows } = buildExportRows()
    const all = [...bookingRows, ...feedbackRows]
    const ws = XLSX.utils.json_to_sheet(all)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportExcel() {
    const { bookingRows, feedbackRows } = buildExportRows()
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bookingRows), 'Bookings')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feedbackRows), 'Feedback')

    // Summary sheet
    const summaryRows = [
      { Metric: 'Month', Value: monthLabel },
      { Metric: 'Checked-out Stays', Value: bookings.length },
      { Metric: 'Unique Guests', Value: guestKeys.size },
      { Metric: 'Total Guests (pax)', Value: totalGuests },
      { Metric: 'Total Feedback', Value: feedbackStats.total },
      { Metric: 'Average Rating', Value: feedbackStats.avg.toFixed(1) },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary')
    XLSX.writeFile(wb, `report-${month}.xlsx`)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6 print:space-y-3 print:p-0">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">
            Printable monthly guest, room usage, and feedback summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-40"
            aria-label="Report month"
          />
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
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

      {/* Print header */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold">Monthly Report</div>
            <div className="text-sm text-muted-foreground">
              {format(range.startDate, 'MMMM yyyy')}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Generated {format(new Date(), 'yyyy-MM-dd HH:mm')}
          </div>
        </div>
        <div className="h-px bg-border my-3" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
        {[
          { label: 'Checked-out stays', value: bookings.length, icon: Users },
          { label: 'Unique guests', value: guestKeys.size, icon: Users },
          { label: 'Total guests (pax)', value: totalGuests, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="print:shadow-none">
            <CardContent className="p-5 print:p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">{loading ? '…' : value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
        <Card className="print:shadow-none">
          <CardHeader className="print:p-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-primary" /> Rooms Most Used
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 print:p-3 print:pt-0">
            {roomsMostUsed.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead className="text-right">Stays</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomsMostUsed.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right font-semibold">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No checked-out stays in this month.</p>
            )}
          </CardContent>
        </Card>

        <Card className="print:shadow-none">
          <CardHeader className="print:p-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-primary" /> Feedback Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4 print:p-3 print:pt-0">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Total feedback</p>
                <p className="text-xl font-bold">{loading ? '…' : feedbackStats.total}</p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-xs text-muted-foreground">Average rating</p>
                <div className="flex items-center justify-end gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-xl font-bold">{loading ? '…' : feedbackStats.avg.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {feedbackStats.topKeywords.length > 0 ? (
                feedbackStats.topKeywords.slice(0, 10).map((k) => (
                  <Badge key={k.word} variant="outline" className="text-xs">
                    {k.word} ({k.count})
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No feedback in this month.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Highlights</p>
                {feedbackStats.best.length > 0 ? (
                  feedbackStats.best.map((f) => (
                    <div key={f.id} className="text-sm">
                      <span className="font-semibold">{Number(f.rating) || 0}/5</span>
                      <span className="text-muted-foreground"> — </span>
                      <span className="line-clamp-2">{f.message}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Needs Improvement</p>
                {feedbackStats.worst.length > 0 ? (
                  feedbackStats.worst.map((f) => (
                    <div key={f.id} className="text-sm">
                      <span className="font-semibold">{Number(f.rating) || 0}/5</span>
                      <span className="text-muted-foreground"> — </span>
                      <span className="line-clamp-2">{f.message}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="print:shadow-none">
        <CardHeader className="print:p-3">
          <CardTitle className="text-base">Feedback List</CardTitle>
        </CardHeader>
        <CardContent className="p-0 print:p-3 print:pt-0">
          {feedbacks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbacks.slice(0, 20).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {f.created_at ? format(new Date(f.created_at), 'yyyy-MM-dd') : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-primary">{f.transaction_code || '—'}</TableCell>
                    <TableCell className="text-sm font-semibold">{Number(f.rating) || 0}/5</TableCell>
                    <TableCell className="text-sm">{f.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">No feedback found for this month.</p>
            </div>
          )}
          {feedbacks.length > 20 && (
            <p className="px-6 pb-6 text-xs text-muted-foreground print:hidden">
              Showing first 20 comments. Use Print to save as PDF, or change the month.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

