import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Debts from './pages/Debts'
import Payments from './pages/Payments'
import BankStatement from './pages/BankStatement'
import CustomerDetail from './pages/CustomerDetail'
import Reports from './pages/Reports'
import Login from './pages/Login'
import Settings from './pages/Settings'

function App() {
  const [user, setUser] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const username = localStorage.getItem('username')
    const role = localStorage.getItem('role')
    if (token && username) setUser({ username, role })
    setChecked(true)
  }, [])

  const onLogin = (data) => setUser({ username: data.username, role: data.role })

  const onLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    setUser(null)
  }

  if (!checked) return null
  if (!user) return <Login onLogin={onLogin} />

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-logo">Veresiye<span>.</span></div>
        <div className="navbar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>📊 Dashboard</NavLink>
          <NavLink to="/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>👥 Müşteriler</NavLink>
          <NavLink to="/debts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>📋 Borçlar</NavLink>
          <NavLink to="/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>💰 Ödemeler</NavLink>
          <NavLink to="/bank" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>🏦 Banka Ekstresi</NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>📈 Raporlar</NavLink>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>👤 {user.username}</span>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>⚙️ Ayarlar</NavLink>
        </div>
      </nav>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/bank" element={<BankStatement />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings user={user} onLogout={onLogout} />} />
        </Routes>
      </div>
    </div>
  )
}

export default App