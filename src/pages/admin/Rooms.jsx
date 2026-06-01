import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, BedDouble, X, Upload, Loader2 } from 'lucide-react'

const ROOM_TYPES = [
  { value: 'single',    label: 'Single' },
  { value: 'double',    label: 'Double' },
  { value: 'triple',    label: 'Triple' },
  { value: 'quad',      label: 'Quad' },
  { value: 'suite',     label: 'Suite' },
  { value: 'event',     label: 'Event Hall' },
  { value: 'other',     label: 'Other' },
]

const BUCKET = 'room-images'

const emptyRoom = { name: '', tag: 'single', price: '', capacity: 1, max_guests: 2, quantity: 1, description: '', amenities: [], images: [], is_active: true }

export default function Rooms() {
  const [rooms, setRooms] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyRoom)
  const [amenityInput, setAmenityInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => { loadRooms() }, [])

  async function loadRooms() {
    const { data } = await supabase.from('rooms').select('*').order('created_at')
    setRooms(data || [])
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyRoom)
    setAmenityInput('')
    setOpen(true)
  }

  function openEdit(room) {
    setEditing(room)
    setForm({ ...room })
    setAmenityInput('')
    setOpen(true)
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    const uploaded = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (error) {
        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' })
      } else {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        uploaded.push(data.publicUrl)
      }
    }
    setForm(f => ({ ...f, images: [...f.images, ...uploaded] }))
    setUploading(false)
    e.target.value = ''
  }

  async function handleImageDelete(url, idx) {
    const path = url.split(`/${BUCKET}/`)[1]
    if (path) await supabase.storage.from(BUCKET).remove([path])
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))
  }

  async function handleSave() {
    setLoading(true)
    const payload = {
      ...form,
      price: parseFloat(form.price),
      capacity: parseInt(form.capacity),
      max_guests: parseInt(form.max_guests),
      quantity: parseInt(form.quantity),
    }
    let error
    if (editing) {
      ({ error } = await supabase.from('rooms').update(payload).eq('id', editing.id))
    } else {
      const { id, created_at, ...insertPayload } = payload
      ;({ error } = await supabase.from('rooms').insert([insertPayload]))
    }
    setLoading(false)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: editing ? 'Room updated' : 'Room added' })
      setOpen(false)
      loadRooms()
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this room? This cannot be undone.')) return
    const { error } = await supabase.from('rooms').delete().eq('id', id)
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' })
    else { toast({ title: 'Room deleted' }); loadRooms() }
  }

  function addAmenity() {
    if (amenityInput.trim() && !form.amenities.includes(amenityInput.trim())) {
      setForm(f => ({ ...f, amenities: [...f.amenities, amenityInput.trim()] }))
      setAmenityInput('')
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rooms</h1>
          <p className="text-muted-foreground text-sm">Manage room listings</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Room
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price/Night</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map(room => (
                <TableRow key={room.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {room.images?.[0] ? (
                        <img src={room.images[0]} alt="" className="h-10 w-14 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-14 rounded bg-muted flex items-center justify-center">
                          <BedDouble className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium text-sm">{room.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{room.tag}</Badge></TableCell>
                  <TableCell className="font-semibold">{formatCurrency(room.price)}</TableCell>
                  <TableCell className="text-sm">{room.capacity} bed · {room.max_guests} guests</TableCell>
                  <TableCell>{room.quantity}</TableCell>
                  <TableCell>
                    <Badge className={room.is_active ? 'bg-green-100 text-green-800 border-0' : 'bg-gray-100 text-gray-800 border-0'}>
                      {room.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(room)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(room.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">No rooms yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Room' : 'Add Room'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Room Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.tag} onValueChange={val => setForm(f => ({ ...f, tag: val }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price / Night (₱)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bed Capacity</Label>
                <Input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Guests</Label>
                <Input type="number" min={1} value={form.max_guests} onChange={e => setForm(f => ({ ...f, max_guests: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Units Available</Label>
                <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-2 flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <Label htmlFor="active">Active / Visible</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g. WiFi" value={amenityInput} onChange={e => setAmenityInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAmenity())} />
                <Button type="button" variant="outline" onClick={addAmenity}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.amenities.map(a => (
                  <span key={a} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                    {a}
                    <button onClick={() => setForm(f => ({ ...f, amenities: f.amenities.filter(x => x !== a) }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Room Photos</Label>
              <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-lg px-4 py-5 cursor-pointer transition-colors ${uploading ? 'opacity-60 pointer-events-none' : 'hover:border-primary hover:bg-primary/5'}`}>
                {uploading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm text-muted-foreground">Uploading…</span></>
                  : <><Upload className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Click to upload photos (JPG, PNG, WEBP)</span></>
                }
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="h-20 w-24 object-cover rounded-lg border" />
                      <button
                        type="button"
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        onClick={() => handleImageDelete(img, i)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || !form.name || !form.price}>
              {loading ? 'Saving…' : editing ? 'Update Room' : 'Add Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
