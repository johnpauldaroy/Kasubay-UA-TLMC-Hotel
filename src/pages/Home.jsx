import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Star, Phone, Mail, MapPin, MessageCircle,
  ChevronLeft, ChevronRight, Wifi, Coffee, Car, Shield,
  Clock, Award, Users, BedDouble, ArrowRight, CheckCircle2,
} from 'lucide-react'

function FacebookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

const heroImages = [
  '/image/hotel.jpg',
  '/image/hotel1.jpg',
  '/image/hotel2.jpg',
  '/image/hotel3.jpg',
  '/image/hotel4.jpg',
  '/image/hotel5.jpg',
]

function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(n)}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={readonly ? 'cursor-default' : 'cursor-pointer transition-transform hover:scale-110'}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              n <= (hovered || value) ? 'fill-primary text-primary' : 'text-muted-foreground/40'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

const AMENITY_HIGHLIGHTS = [
  { icon: Wifi,    label: 'Free WiFi',       desc: 'High-speed internet throughout' },
  { icon: Coffee,  label: 'Breakfast',       desc: 'Complimentary morning meal' },
  { icon: Car,     label: 'Free Parking',    desc: 'Secure on-site parking' },
  { icon: Shield,  label: '24/7 Security',   desc: 'Round-the-clock safety' },
  { icon: Clock,   label: 'Flexible Hours',  desc: 'Easy check-in & check-out' },
  { icon: Award,   label: 'Top Rated',       desc: 'Consistently highly reviewed' },
]

function StatItem({ icon: Icon, label, target, suffix = '', decimals = 0, delay = 0, active }) {
  const [localActive, setLocalActive] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setLocalActive(true), delay)
    return () => clearTimeout(t)
  }, [active, delay])

  useEffect(() => {
    if (!localActive) return
    const duration = 1800
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(parseFloat((eased * target).toFixed(decimals)))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [localActive, target, decimals])

  return (
    <div className={`flex flex-col items-center py-8 px-4 text-center transition-all duration-700 ${
      active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`} style={{ transitionDelay: `${delay}ms` }}>
      <div className={`mb-3 transition-transform duration-500 ${active ? 'scale-100' : 'scale-75'}`}
        style={{ transitionDelay: `${delay + 200}ms` }}>
        <Icon className="h-6 w-6 text-white/70" />
      </div>
      <p className="text-3xl md:text-4xl font-bold text-white tabular-nums">
        {decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}{suffix}
      </p>
      <p className="text-xs text-white/70 mt-1 font-medium uppercase tracking-wider">{label}</p>
    </div>
  )
}

function StatsBar({ avgRating, statsRef, statsVisible }) {
  return (
    <section ref={statsRef} className="bg-primary overflow-hidden">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-white/20">
        <StatItem icon={Users}     label="Happy Guests"    target={1200} suffix="+"  delay={0}   active={statsVisible} />
        <StatItem icon={BedDouble} label="Room Types"      target={4}    suffix=""   delay={150} active={statsVisible} />
        <StatItem icon={Award}     label="Years of Service" target={10}  suffix="+"  delay={300} active={statsVisible} />
        <StatItem icon={Star}      label="Average Rating"  target={parseFloat(avgRating)} suffix=" ★" decimals={1} delay={450} active={statsVisible} />
      </div>
    </section>
  )
}

export default function Home() {
  const [slide, setSlide] = useState(0)
  const [settings, setSettings] = useState({})
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbackSlide, setFeedbackSlide] = useState(0)
  const [form, setForm] = useState({ name: '', email: '', message: '', rating: 5 })
  const [submitting, setSubmitting] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef(null)
  const { toast } = useToast()
  const heroTimerRef = useRef(null)

  // Count-up animation hook
  function useCountUp(target, duration = 1800, active = false) {
    const [count, setCount] = useState(0)
    useEffect(() => {
      if (!active) return
      let start = null
      const step = (ts) => {
        if (!start) start = ts
        const progress = Math.min((ts - start) / duration, 1)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.floor(eased * target))
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, [active, target, duration])
    return count
  }

  useEffect(() => {
    heroTimerRef.current = setInterval(() => setSlide(s => (s + 1) % heroImages.length), 5000)
    return () => clearInterval(heroTimerRef.current)
  }, [])

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    supabase.from('settings').select('*').single().then(({ data }) => {
      if (data) setSettings(data)
    })
    supabase.from('feedbacks').select('*').order('created_at', { ascending: false }).limit(9).then(({ data }) => {
      if (data) setFeedbacks(data)
    })
  }, [])

  function goSlide(dir) {
    clearInterval(heroTimerRef.current)
    setSlide(s => (s + dir + heroImages.length) % heroImages.length)
    heroTimerRef.current = setInterval(() => setSlide(s => (s + 1) % heroImages.length), 5000)
  }

  async function handleFeedback(e) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.from('feedbacks').insert([form])
    setSubmitting(false)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Thank you!', description: 'Your feedback has been submitted.' })
      setForm({ name: '', email: '', message: '', rating: 5 })
      supabase.from('feedbacks').select('*').order('created_at', { ascending: false }).limit(9).then(({ data }) => {
        if (data) setFeedbacks(data)
      })
    }
  }

  const avgRating = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
    : '5.0'

  const feedbackGroups = []
  for (let i = 0; i < feedbacks.length; i += 3) feedbackGroups.push(feedbacks.slice(i, i + 3))

  const hotelName = settings.hotel_name || 'Kasubay UA-TLMC Hotel'

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        navScrolled
          ? 'bg-slate-900/95 backdrop-blur-md shadow-lg border-b border-white/10'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/image/UALogo.png"
              alt="UA Logo"
              className="h-9 w-9 rounded-xl object-cover shadow-md group-hover:scale-105 transition-transform"
            />
            <span className="font-bold text-white text-base tracking-tight">{hotelName}</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/80">
            <a href="#rooms" className="hover:text-white transition-colors">Rooms</a>
            <a href="#amenities" className="hover:text-white transition-colors">Amenities</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#reviews" className="hover:text-white transition-colors">Reviews</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/booking">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white shadow-md font-semibold px-5">
                Book Now
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 text-xs">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative h-screen overflow-hidden">
        {heroImages.map((src, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/20 to-slate-900/85" />
          </div>
        ))}

        {/* Carousel controls */}
        <button
          onClick={() => goSlide(-1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm transition-all hover:scale-105"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => goSlide(1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm transition-all hover:scale-105"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Hero content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4 z-10">
          <span className="inline-flex items-center gap-1.5 mb-5 px-4 py-1.5 rounded-full bg-primary/80 backdrop-blur-sm text-sm font-medium">
            <Award className="h-3.5 w-3.5" /> Premium Hospitality Experience
          </span>
          <h1 className="text-5xl md:text-7xl font-bold mb-5 drop-shadow-2xl leading-tight tracking-tight">
            {hotelName}
          </h1>
          <p className="text-lg md:text-xl text-white/85 max-w-2xl mb-10 leading-relaxed">
            Discover comfort, elegance, and exceptional service.<br className="hidden md:block" />
            Your perfect stay begins here.
          </p>

          {/* Quick booking bar — Agoda style */}
          <div className="w-full max-w-3xl bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-2xl">
            <div className="flex flex-wrap md:flex-nowrap gap-2 items-end">
              <div className="flex-1 min-w-[130px] bg-white/10 rounded-xl px-3 pt-2 pb-2 text-left">
                <label className="text-xs text-white/70 font-medium">Check-In</label>
                <input
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full bg-transparent text-white text-sm font-semibold outline-none [color-scheme:dark] mt-0.5"
                />
              </div>
              <div className="flex-1 min-w-[130px] bg-white/10 rounded-xl px-3 pt-2 pb-2 text-left">
                <label className="text-xs text-white/70 font-medium">Check-Out</label>
                <input
                  type="date"
                  defaultValue={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  className="w-full bg-transparent text-white text-sm font-semibold outline-none [color-scheme:dark] mt-0.5"
                />
              </div>
              <div className="w-28 bg-white/10 rounded-xl px-3 pt-2 pb-2 text-left">
                <label className="text-xs text-white/70 font-medium">Guests</label>
                <div className="flex items-center gap-1 mt-0.5">
                  <Users className="h-3.5 w-3.5 text-white/70" />
                  <input
                    type="number"
                    min={1}
                    defaultValue={1}
                    className="w-full bg-transparent text-white text-sm font-semibold outline-none"
                  />
                </div>
              </div>
              <Link to="/booking" className="shrink-0">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold px-8 h-12 rounded-xl shadow-lg">
                  Search Rooms
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === slide ? 'w-8 h-2 bg-primary' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </section>

      {/* ── Stats bar ── */}
      <StatsBar avgRating={avgRating} statsRef={statsRef} statsVisible={statsVisible} />

      {/* ── Room Previews ── */}
      <section id="rooms" className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 text-primary border-primary/30 bg-primary/5">Our Rooms</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Comfortable Accommodations</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              Choose from our selection of well-appointed rooms, designed for relaxation and comfort.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Single Bed',  price: '₱1,299',  img: heroImages[0], badge: 'Best Value',  desc: 'Cozy room perfect for solo travelers.' },
              { name: 'Double Bed',  price: '₱1,799',  img: heroImages[1], badge: 'Popular',     desc: 'Spacious room ideal for couples.' },
              { name: 'Triple Bed',  price: '₱2,499',  img: heroImages[2], badge: 'Family Pick', desc: 'Fits families and small groups.' },
              { name: 'Event Hall',  price: '₱15,000', img: heroImages[3], badge: 'Premium',     desc: 'Perfect for events and celebrations.' },
            ].map(({ name, price, img, badge, desc }) => (
              <Card key={name} className="overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/60">
                <div className="relative overflow-hidden h-52">
                  <img src={img} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute top-3 left-3 text-xs font-bold bg-primary text-white px-2.5 py-1 rounded-full">
                    {badge}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white font-bold text-base">{name}</p>
                    <p className="text-white/80 text-xs">{desc}</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xl font-bold text-primary">{price}</span>
                      <span className="text-xs text-muted-foreground ml-1">/night</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium">4.8</span>
                    </div>
                  </div>
                  <Link to="/booking">
                    <Button size="sm" className="w-full group/btn">
                      Book Now
                      <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/booking">
              <Button size="lg" variant="outline" className="px-10 border-primary text-primary hover:bg-primary hover:text-white">
                View All Rooms & Check Availability
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Amenities ── */}
      <section id="amenities" className="py-20 px-4 bg-muted/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3 text-primary border-primary/30 bg-primary/5">Why Choose Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything You Need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              Premium amenities and services to make your stay unforgettable.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {AMENITY_HIGHLIGHTS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4 p-5 bg-white rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-shadow">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">About Us</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight">
                A Place You'll<br />Always Call Home
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6 text-sm md:text-base">
                Kasubay UA-TLMC Hotel offers a premium hospitality experience with modern amenities,
                comfortable rooms, and an event hall perfect for any occasion. Located in the heart
                of the city, we blend convenience with luxury.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Modern rooms with premium bedding',
                  'Event hall for up to 200 guests',
                  'Strategic city-center location',
                  'Professional and friendly staff',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="space-y-2.5">
                {[
                  { icon: Phone,  text: settings.hotel_phone   || '09367450372' },
                  { icon: Mail,   text: settings.hotel_email   || 'kasubayhotel@gmail.com' },
                  { icon: MapPin, text: settings.hotel_address || 'Tibiao, Antique, Philippines' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {text}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {heroImages.slice(0, 4).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className={`rounded-2xl object-cover w-full shadow-md ${i % 2 === 0 ? 'h-52' : 'h-40 mt-4'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Guest Reviews ── */}
      {feedbacks.length > 0 && (
        <section id="reviews" className="py-20 px-4 bg-muted/40">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-3 text-primary border-primary/30 bg-primary/5">Guest Reviews</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">What Our Guests Say</h2>
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className="flex">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`h-5 w-5 ${n <= Math.round(+avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                <span className="font-bold text-lg">{avgRating}</span>
                <span className="text-muted-foreground text-sm">({feedbacks.length} reviews)</span>
              </div>
            </div>

            <div className="relative">
              <div className="grid md:grid-cols-3 gap-5">
                {(feedbackGroups[feedbackSlide] || feedbacks.slice(0, 3)).map(fb => (
                  <Card key={fb.id} className="p-5 border border-border/60 hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base">
                        {fb.name?.[0]?.toUpperCase() || 'G'}
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={`h-4 w-4 ${n <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-3">"{fb.message}"</p>
                    <div>
                      <p className="font-semibold text-sm">{fb.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fb.created_at ? new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Guest'}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>

              {feedbackGroups.length > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {feedbackGroups.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFeedbackSlide(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === feedbackSlide ? 'w-8 h-2 bg-primary' : 'w-2 h-2 bg-border hover:bg-primary/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Leave Feedback ── */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3 text-primary border-primary/30 bg-primary/5">Feedback</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Share Your Experience</h2>
            <p className="text-muted-foreground text-sm">We genuinely value every guest's feedback.</p>
          </div>
          <Card className="p-6 md:p-8 border border-border/60 shadow-sm">
            <form onSubmit={handleFeedback} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label className="text-sm font-medium">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    type="email"
                    placeholder="juan@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Your Rating</Label>
                <StarRating value={form.rating} onChange={r => setForm(f => ({ ...f, rating: r }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Message <span className="text-destructive">*</span></Label>
                <Textarea
                  rows={4}
                  placeholder="Tell us about your stay…"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  required
                  className="resize-none"
                />
              </div>
              <Button type="submit" className="w-full font-semibold h-11" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Feedback'}
              </Button>
            </form>
          </Card>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-white pt-14 pb-6 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/image/UALogo.png"
                alt="UA Logo"
                className="h-9 w-9 rounded-xl object-cover"
              />
              <span className="font-bold text-base">{hotelName}</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              Your perfect stay awaits. Experience comfort and hospitality at its finest.
            </p>
            <div className="flex gap-2">
              {settings.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-primary transition-colors">
                  <FacebookIcon className="h-4 w-4" />
                </a>
              )}
              {settings.messenger_url && (
                <a href={settings.messenger_url} target="_blank" rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-primary transition-colors">
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-300">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {[
                { to: '/',        label: 'Home' },
                { to: '/booking', label: 'Book a Room' },
                { to: '#rooms',   label: 'Our Rooms' },
                { to: '#about',   label: 'About Us' },
              ].map(({ to, label }) => (
                <li key={label}>
                  <Link to={to} className="hover:text-white transition-colors flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 text-primary" />{label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-300">Room Types</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {['Single Bed', 'Double Bed', 'Triple Bed', 'Event Hall'].map(r => (
                <li key={r}>
                  <Link to="/booking" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 text-primary" />{r}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-300">Contact</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                {settings.hotel_phone || '09367450372'}
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                {settings.hotel_email || 'kasubayhotel@gmail.com'}
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                {settings.hotel_address || 'Tibiao, Antique, Philippines'}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} {hotelName}. All rights reserved.</span>
          <span>Powered by Kasubay UA-TLMC Hotel Management System</span>
        </div>
      </footer>

      {/* ── Floating social buttons ── */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2.5 z-40">
        {settings.messenger_url && (
          <a href={settings.messenger_url} target="_blank" rel="noreferrer"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg hover:scale-110 hover:shadow-xl transition-all"
            title="Message us">
            <MessageCircle className="h-5 w-5 text-white" />
          </a>
        )}
        {settings.facebook_url && (
          <a href={settings.facebook_url} target="_blank" rel="noreferrer"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 shadow-lg hover:scale-110 hover:shadow-xl transition-all"
            title="Facebook">
            <FacebookIcon className="h-5 w-5 text-white" />
          </a>
        )}
      </div>
    </div>
  )
}
