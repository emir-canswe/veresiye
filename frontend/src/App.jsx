import { Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const username = localStorage.getItem('username')
    const role = localStorage.getItem('role')
    if (token && username) setUser({ username, role })
    setChecked(true)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
          <NavLink to="/bank" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>🏦 Akıllı Ödeme</NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>📈 Raporlar</NavLink>
        </div>

        {/* Kullanıcı dropdown */}
        <div style={{ marginLeft: 'auto', position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: dropdownOpen ? 'var(--primary-light)' : '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: 12, padding: '8px 14px',
              cursor: 'pointer', transition: 'all 0.18s'
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white'
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{user?.username}</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{dropdownOpen ? '▲' : '▼'}</span>
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: 'white', borderRadius: 16,
              boxShadow: '0 12px 40px rgba(26,86,219,0.18)',
              border: '1px solid #e8f0fe',
              width: 220, zIndex: 999, overflow: 'hidden'
            }}>
              {/* Kullanıcı başlık */}
              <div style={{
                padding: '16px', borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #1a56db 0%, #3b82f6 100%)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, color: 'white'
                  }}>
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>{user?.username}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                      {user?.role === 'admin' ? '👑 Admin' : '👤 Çalışan'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menü itemleri */}
              <div style={{ padding: '8px' }}>
                <NavLink to="/settings" onClick={() => setDropdownOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, color: '#374151', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 16 }}>⚙️</span> Ayarlar
                </NavLink>

                <div style={{ height: 1, background: '#f1f5f9', margin: '6px 0' }} />

                <button onClick={onLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fde8e8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 16 }}>🚪</span> Çıkış Yap
                </button>
              </div>
            </div>
          )}
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