import { Routes, Route } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import About from './pages/About'
import Admin from './pages/Admin'
import Changelog from './pages/Changelog'
import Contact from './pages/Contact'
import Dashboard from './pages/Dashboard'
import Demo from './pages/Demo'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Pricing from './pages/Pricing'
import Privacy from './pages/Privacy'
import Records from './pages/Records'
import Register from './pages/Register'
import Security from './pages/Security'
import Settings from './pages/Settings'
import Terms from './pages/Terms'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/security" element={<Security />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/demo" element={<ProtectedRoute><Demo /></ProtectedRoute>} />
        <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
