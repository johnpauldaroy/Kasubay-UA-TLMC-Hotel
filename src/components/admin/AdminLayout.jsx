import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BedDouble, Users, CalendarDays,
  DoorOpen, TrendingUp, Settings, LogOut, Menu, FileText,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { to: '/admin',          label: 'Dashboard',   icon: LayoutDashboard, end: true },
  { to: '/admin/rooms',    label: 'Rooms',        icon: BedDouble },
  { to: '/admin/guests',   label: 'Guests',       icon: Users },
  { to: '/admin/bookings', label: 'Bookings',     icon: CalendarDays },
  { to: '/admin/walk-in',  label: 'Walk-In',      icon: DoorOpen },
  { to: '/admin/revenue',  label: 'Revenue',      icon: TrendingUp },
  { to: '/admin/reports',  label: 'Reports',      icon: FileText },
  { to: '/admin/settings', label: 'Settings',     icon: Settings },
]

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  async function handleSignOut() {
    await signOut()
    toast({ title: 'Signed out successfully' })
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden print:h-auto print:bg-white print:overflow-visible">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-700 bg-slate-900 text-slate-100 shadow-sm transition-all duration-200 lg:static lg:translate-x-0 print:hidden',
          sidebarCollapsed ? 'w-20' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className={cn('flex', sidebarCollapsed ? 'flex-col items-center gap-2 px-2 py-4' : 'items-center justify-between px-4 py-5')}>
          <div className={cn('flex items-center', sidebarCollapsed ? '' : 'gap-3')}>
            <img
              src="/image/UALogo.png"
              alt="UA Logo"
              className="h-9 w-9 rounded-lg object-cover"
            />
            {!sidebarCollapsed && (
              <div>
                <p className="text-sm font-semibold leading-none text-white">Kasubay UA-TLMC Hotel</p>
                <p className="text-xs text-slate-300">Admin Panel</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex text-slate-200 hover:bg-slate-800 hover:text-white"
            onClick={() => setSidebarCollapsed(v => !v)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <Separator className="bg-slate-700" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors',
                  sidebarCollapsed ? 'justify-center' : 'gap-3',
                  isActive
                    ? 'bg-primary/20 text-primary font-medium'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && label}
            </NavLink>
          ))}
        </nav>

        <Separator className="bg-slate-700" />
        {/* User + Logout */}
        <div className={cn('px-4 py-4 flex items-center', sidebarCollapsed ? 'flex-col justify-center gap-2' : 'gap-3')}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              AD
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">{user?.email ?? 'Admin'}</p>
              <p className="text-xs text-slate-300">Administrator</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="flex items-center gap-4 border-b bg-card px-4 py-3 lg:hidden print:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm">Kasubay UA-TLMC Hotel Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
