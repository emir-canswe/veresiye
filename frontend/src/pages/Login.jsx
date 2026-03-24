import { useState } from 'react'
import axios from 'axios'

const API = 'https://veresiye-backend.onrender.com'

export default function Login({ onLogin }) {
    const [form, setForm] = useState({ username: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showRegister, setShowRegister] = useState(false)
    const [regForm, setRegForm] = useState({ username: '', password: '', password2: '' })
    const [showPass, setShowPass] = useState(false)
    const [showRegPass, setShowRegPass] = useState(false)

    const login = async () => {
        if (!form.username || !form.password) return
        setLoading(true)
        setError('')
        try {
            const fd = new FormData()
            fd.append('username', form.username)
            fd.append('password', form.password)
            const res = await axios.post(`${API}/auth/login`, fd)
            localStorage.setItem('token', res.data.access_token)
            localStorage.setItem('username', res.data.username)
            localStorage.setItem('role', res.data.role)
            onLogin(res.data)
        } catch {
            setError('Kullanıcı adı veya şifre hatalı!')
        }
        setLoading(false)
    }

    const register = async () => {
        if (regForm.password !== regForm.password2) { setError('Şifreler eşleşmiyor!'); return }
        if (regForm.password.length < 6) { setError('Şifre en az 6 karakter olmalı!'); return }
        setLoading(true)
        setError('')
        try {
            await axios.post(`${API}/auth/register`, { username: regForm.username, password: regForm.password, role: 'admin' })
            setShowRegister(false)
            setForm({ username: regForm.username, password: regForm.password })
            setRegForm({ username: '', password: '', password2: '' })
        } catch (e) {
            setError(e.response?.data?.detail || 'Kayıt başarısız!')
        }
        setLoading(false)
    }

    const inputStyle = {
        width: '100%', padding: '13px 16px',
        border: '1.5px solid #e2e8f0', borderRadius: 12,
        fontSize: 15, outline: 'none', color: '#111827',
        background: '#f8fafc', transition: 'all 0.18s',
        fontFamily: 'Segoe UI, sans-serif'
    }

    const labelStyle = {
        display: 'block', fontSize: 13,
        fontWeight: 600, marginBottom: 7, color: '#374151'
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex',
            background: 'linear-gradient(135deg, #1a56db 0%, #1e429f 60%, #1e3a8a 100%)',
            position: 'relative', overflow: 'hidden'
        }}>
            {/* Dekoratif daireler */}
            <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -100, left: -100 }} />
            <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -80, right: -80 }} />
            <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: '40%', left: '10%' }} />

            {/* Sol panel */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'center', padding: '60px 80px',
                color: 'white'
            }}>
                <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, letterSpacing: -1 }}>
                    Tahsilat<span style={{ color: '#93c5fd' }}>Pro</span>
                </div>
                <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16, lineHeight: 1.2, letterSpacing: -1 }}>
                    Cari Hesap<br />Yönetimini<br />
                    <span style={{ color: '#93c5fd' }}>Kolaylaştırın</span>
                </h1>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: 380 }}>
                    Müşteri borçlarınızı takip edin, banka ekstrelerinizi otomatik işleyin ve finansal raporlarınızı anında alın.
                </p>

                <div style={{ display: 'flex', gap: 32, marginTop: 48 }}>
                    {[
                        { icon: '👥', label: 'Müşteri Takibi' },
                        { icon: '🏦', label: 'Akıllı Ödeme' },
                        { icon: '📈', label: 'Raporlama' },
                    ].map(f => (
                        <div key={f.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 14,
                                background: 'rgba(255,255,255,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                            }}>{f.icon}</div>
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{f.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sağ panel - form (BURADA DÜZENLEME YAPILDI) */}
            <div style={{
                width: 580, display: 'flex', alignItems: 'center',
                justifyContent: 'flex-start', padding: '40px 40px 40px 0px'
            }}>
                <div style={{
                    background: 'white', borderRadius: 24, padding: '44px 40px',
                    width: '100%', maxWidth: 440, boxShadow: '0 32px 80px rgba(0,0,0,0.25)'
                }}>
                    {!showRegister ? (
                        <>
                            <div style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 6, letterSpacing: -0.5 }}>
                                    Hoş Geldiniz 👋
                                </h2>
                                <p style={{ fontSize: 14, color: '#6b7280' }}>Hesabınıza giriş yapın</p>
                            </div>

                            {error && (
                                <div style={{
                                    background: '#fde8e8', color: '#e02424',
                                    padding: '11px 14px', borderRadius: 10,
                                    fontSize: 13, fontWeight: 500, marginBottom: 20,
                                    border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                    ❌ {error}
                                </div>
                            )}

                            <div style={{ marginBottom: 18 }}>
                                <label style={labelStyle}>Kullanıcı Adı</label>
                                <input
                                    style={inputStyle}
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    placeholder="Kullanıcı adınız"
                                    onKeyDown={e => e.key === 'Enter' && login()}
                                    onFocus={e => e.target.style.borderColor = '#1a56db'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={labelStyle}>Şifre</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        style={{ ...inputStyle, paddingRight: 44 }}
                                        type={showPass ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        placeholder="••••••••"
                                        onKeyDown={e => e.key === 'Enter' && login()}
                                        onFocus={e => e.target.style.borderColor = '#1a56db'}
                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                    <button onClick={() => setShowPass(!showPass)} style={{
                                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af'
                                    }}>
                                        {showPass ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={login}
                                disabled={loading || !form.username || !form.password}
                                style={{
                                    width: '100%', padding: '14px',
                                    background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1a56db, #3b82f6)',
                                    color: 'white', border: 'none', borderRadius: 12,
                                    fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 16px rgba(26,86,219,0.35)',
                                    transition: 'all 0.18s', letterSpacing: 0.3
                                }}
                            >
                                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
                            </button>

                            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#6b7280' }}>
                                Hesabınız yok mu?{' '}
                                <span
                                    style={{ color: '#1a56db', cursor: 'pointer', fontWeight: 700 }}
                                    onClick={() => { setShowRegister(true); setError('') }}
                                >
                                    Kayıt Ol
                                </span>
                            </p>
                        </>
                    ) : (
                        <>
                            <div style={{ marginBottom: 32 }}>
                                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 6, letterSpacing: -0.5 }}>
                                    Hesap Oluştur 🚀
                                </h2>
                                <p style={{ fontSize: 14, color: '#6b7280' }}>Yeni hesabınızı oluşturun</p>
                            </div>

                            {error && (
                                <div style={{
                                    background: '#fde8e8', color: '#e02424',
                                    padding: '11px 14px', borderRadius: 10,
                                    fontSize: 13, fontWeight: 500, marginBottom: 20,
                                    border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                    ❌ {error}
                                </div>
                            )}

                            <div style={{ marginBottom: 18 }}>
                                <label style={labelStyle}>Kullanıcı Adı</label>
                                <input
                                    style={inputStyle}
                                    value={regForm.username}
                                    onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                                    placeholder="Kullanıcı adınız"
                                    onFocus={e => e.target.style.borderColor = '#1a56db'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            <div style={{ marginBottom: 18 }}>
                                <label style={labelStyle}>Şifre</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        style={{ ...inputStyle, paddingRight: 44 }}
                                        type={showRegPass ? 'text' : 'password'}
                                        value={regForm.password}
                                        onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                                        placeholder="En az 6 karakter"
                                        onFocus={e => e.target.style.borderColor = '#1a56db'}
                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                    <button onClick={() => setShowRegPass(!showRegPass)} style={{
                                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af'
                                    }}>
                                        {showRegPass ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {regForm.password && (
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ display: 'flex', gap: 3 }}>
                                            {[1, 2, 3, 4].map(i => {
                                                const s = (regForm.password.length >= 6 ? 1 : 0) + (regForm.password.length >= 8 ? 1 : 0) + (/[A-Z]/.test(regForm.password) ? 1 : 0) + (/[0-9]/.test(regForm.password) ? 1 : 0)
                                                const c = s <= 1 ? '#ef4444' : s === 2 ? '#f97316' : s === 3 ? '#f59e0b' : '#10b981'
                                                return <div key={i} style={{ height: 3, flex: 1, borderRadius: 3, background: i <= s ? c : '#e5e7eb' }} />
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={labelStyle}>Şifre Tekrar</label>
                                <input
                                    style={inputStyle}
                                    type="password"
                                    value={regForm.password2}
                                    onChange={e => setRegForm({ ...regForm, password2: e.target.value })}
                                    placeholder="Şifrenizi tekrar girin"
                                    onFocus={e => e.target.style.borderColor = '#1a56db'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                />
                                {regForm.password2 && (
                                    <div style={{
                                        fontSize: 12, marginTop: 5, fontWeight: 500,
                                        color: regForm.password === regForm.password2 ? '#057a55' : '#e02424'
                                    }}>
                                        {regForm.password === regForm.password2 ? '✅ Şifreler eşleşiyor' : '❌ Şifreler eşleşmiyor'}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={register}
                                disabled={loading || !regForm.username || !regForm.password}
                                style={{
                                    width: '100%', padding: '14px',
                                    background: loading ? '#93c5fd' : 'linear-gradient(135deg, #1a56db, #3b82f6)',
                                    color: 'white', border: 'none', borderRadius: 12,
                                    fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 16px rgba(26,86,219,0.35)',
                                    transition: 'all 0.18s', letterSpacing: 0.3
                                }}
                            >
                                {loading ? 'Kaydediliyor...' : 'Hesap Oluştur →'}
                            </button>

                            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#6b7280' }}>
                                Zaten hesabınız var mı?{' '}
                                <span
                                    style={{ color: '#1a56db', cursor: 'pointer', fontWeight: 700 }}
                                    onClick={() => { setShowRegister(false); setError('') }}
                                >
                                    Giriş Yap
                                </span>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}