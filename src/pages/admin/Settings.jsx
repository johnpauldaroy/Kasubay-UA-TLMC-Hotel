import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Save, Hotel, Globe, Tag } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState({
    hotel_name: '', hotel_phone: '', hotel_email: '', hotel_address: '',
    facebook_url: '', messenger_url: '', logo_url: '',
  })
  const [promoCodes, setPromoCodes] = useState([])
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoForm, setPromoForm] = useState({ code: '', discount_pct: '' })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('settings').select('*').single(),
      supabase.from('promo_codes').select('*').order('created_at'),
    ])
    if (s) setSettings({ ...settings, ...s })
    setPromoCodes(p || [])
  }

  async function saveSettings() {
    setLoading(true)
    const { error } = await supabase.from('settings').upsert([{ id: 1, ...settings }])
    setLoading(false)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else toast({ title: 'Settings saved!' })
  }

  async function addPromo() {
    const { error } = await supabase.from('promo_codes').insert([{
      code: promoForm.code.toUpperCase(),
      discount_pct: parseFloat(promoForm.discount_pct),
    }])
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Promo code added' }); setPromoOpen(false); setPromoForm({ code: '', discount_pct: '' }); loadAll() }
  }

  async function deletePromo(id) {
    if (!confirm('Delete this promo code?')) return
    await supabase.from('promo_codes').delete().eq('id', id)
    loadAll()
  }

  async function togglePromo(id, current) {
    await supabase.from('promo_codes').update({ is_active: !current }).eq('id', id)
    loadAll()
  }

  const field = (key, label, type = 'text', placeholder = '') => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} placeholder={placeholder} value={settings[key] || ''}
        onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} />
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Hotel configuration and global settings</p>
      </div>

      {/* Hotel Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Hotel className="h-4 w-4" /> Hotel Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {field('hotel_name', 'Hotel Name', 'text', 'Kasubay UA-TLMC Hotel')}
          <div className="grid grid-cols-2 gap-4">
            {field('hotel_phone', 'Phone Number', 'tel', '+63 XXX XXX XXXX')}
            {field('hotel_email', 'Email Address', 'email', 'info@hotel.com')}
          </div>
          {field('hotel_address', 'Address', 'text', 'Street, City, Province')}
          {field('logo_url', 'Logo URL', 'url', 'https://...')}
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Social Media Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {field('facebook_url', 'Facebook Page URL', 'url', 'https://facebook.com/...')}
          {field('messenger_url', 'Messenger URL', 'url', 'https://m.me/...')}
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={loading} className="w-full md:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {loading ? 'Saving…' : 'Save Settings'}
      </Button>

      <Separator />

      {/* Promo Codes */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" /> Promo Codes
            </CardTitle>
            <Button size="sm" onClick={() => setPromoOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Promo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoCodes.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-bold">{p.code}</TableCell>
                  <TableCell>{p.discount_pct}% off</TableCell>
                  <TableCell>
                    <button onClick={() => togglePromo(p.id, p.is_active)}>
                      <Badge className={p.is_active ? 'bg-green-100 text-green-800 border-0 cursor-pointer' : 'bg-gray-100 text-gray-800 border-0 cursor-pointer'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deletePromo(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {promoCodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">No promo codes</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Promo Code</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input placeholder="e.g. SUMMER20" value={promoForm.code}
                onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input type="number" min={1} max={100} placeholder="e.g. 10" value={promoForm.discount_pct}
                onChange={e => setPromoForm(f => ({ ...f, discount_pct: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoOpen(false)}>Cancel</Button>
            <Button onClick={addPromo} disabled={!promoForm.code || !promoForm.discount_pct}>Add Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
