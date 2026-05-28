import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'

import Home from '@/pages/Home'
import Booking from '@/pages/Booking'
import Login from '@/pages/Login'
import Feedback from '@/pages/Feedback'
import AdminLayout from '@/components/admin/AdminLayout'
import Dashboard from '@/pages/admin/Dashboard'
import Rooms from '@/pages/admin/Rooms'
import Guests from '@/pages/admin/Guests'
import Bookings from '@/pages/admin/Bookings'
import WalkIn from '@/pages/admin/WalkIn'
import Revenue from '@/pages/admin/Revenue'
import Settings from '@/pages/admin/Settings'

const queryClient = new QueryClient()

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/login" element={<Login />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="rooms" element={<Rooms />} />
              <Route path="guests" element={<Guests />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="walk-in" element={<WalkIn />} />
              <Route path="revenue" element={<Revenue />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
