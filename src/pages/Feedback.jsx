import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Hotel, Star, CheckCircle2, ArrowRight } from 'lucide-react'

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            className="transition-transform hover:scale-125 focus:outline-none"
          >
            <Star
              className={`h-10 w-10 transition-colors duration-150 ${
                n <= (hovered || value)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
      {(hovered || value) > 0 && (
        <p className="text-center text-sm font-semibold text-amber-600">
          {labels[hovered || value]}
        </p>
      )}
    </div>
  )
}

export default function FeedbackPage() {
  const [params] = useSearchParams()
  const [settings, setSettings] = useState({})
  const [form, setForm] = useState({
    name:    params.get('name')  ?? '',
    email:   params.get('email') ?? '',
    message: '',
    rating:  5,
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const { toast } = useToast()

  const txCode = params.get('code') ?? ''

  useEffect(() => {
    supabase.from('settings').select('*').single().then(({ data }) => {
      if (data) setSettings(data)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.rating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    const { error } = await supabase.from('feedbacks').insert([{
      name:             form.name,
      email:            form.email,
      message:          form.message,
      rating:           form.rating,
      transaction_code: txCode || null,
    }])
    setSubmitting(false)
    if (error) {
      toast({ title: 'Error submitting feedback', description: error.message, variant: 'destructive' })
    } else {
      setDone(true)
    }
  }

  const hotelName = settings.hotel_name || 'Kasubay Hotel'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mb-8 group">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg group-hover:scale-105 transition-transform">
          <Hotel className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-white text-lg">{hotelName}</span>
      </Link>

      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardContent className="p-8">
          {done ? (
            /* ── Success state ── */
            <div className="text-center space-y-4 py-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Thank You! 🙏</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your feedback has been submitted. It genuinely helps us improve and provide
                an even better experience for every guest.
              </p>
              <div className="flex gap-1 justify-center mt-2">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`h-6 w-6 ${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
              <div className="pt-4 space-y-2">
                <Link to="/">
                  <Button className="w-full gap-2">
                    Back to Home <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/booking">
                  <Button variant="outline" className="w-full">Book Again</Button>
                </Link>
              </div>
            </div>
          ) : (
            /* ── Feedback form ── */
            <>
              <div className="text-center mb-7">
                <h2 className="text-2xl font-bold mb-1">How Was Your Stay?</h2>
                <p className="text-muted-foreground text-sm">
                  {txCode
                    ? `Booking ${txCode} · Share your experience`
                    : 'We\'d love to hear your honest feedback'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Star rating — prominent */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-center block">Overall Rating</Label>
                  <StarPicker value={form.rating} onChange={r => setForm(f => ({ ...f, rating: r }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Your name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Email <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="you@email.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Your Review <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    rows={4}
                    placeholder="Tell us about your experience — what did you love? What could we improve?"
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    required
                    className="resize-none"
                  />
                </div>

                <Button type="submit" className="w-full h-11 font-semibold" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-slate-500 text-xs mt-6">
        © {new Date().getFullYear()} {hotelName} · All rights reserved
      </p>
    </div>
  )
}
