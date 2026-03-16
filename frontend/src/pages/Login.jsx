import { useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

export default function Login({ onLogin }) {
    const [form, setForm] = useState({ username: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showRegister, setShowRegister] = useState(false)
    const [regForm, setRegForm] = useState({ username: '', password: '', password2: '' })

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
        if (regForm.password !== regForm.password2) {
            setError('Şifreler eşleşmiyor!')
            return
        }
        setLoading(true)
        setError('')
        try {
            await axios.post(`${API}/auth/register`, {
                username: regForm.username,
                password: regForm.password,
                role: 'admin'
            })
            setShowRegister(false)
            setForm({ username: regForm.username, password: regForm.password })
            setRegForm({ username: '', password: '', password2: '' })
        } catch (e) {
            setError(e.response?.data?.detail || 'Kayıt başarısız!')
        }
        setLoading(false)
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a56db 0%, #1e429f 100%)'
        }}>
            <div style={{
                background: 'white', borderRadius: 20, padding: 48, width: 420,
                boxShadow: '0 25px 60px rgba(0,0,0,0.2)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: '#1a56db' }}>
                        Veresiye<span style={{ color: '#1a1a2e' }}>.</span>
                    </div>
                    <p style={{ color: '#6b7280', marginTop: 8, fontSize: 14 }}>
                        {showRegister ? 'Yeni hesap oluştur' : 'Hesabınıza giriş yapın'}
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: '#fde8e8', color: '#e02424', padding: '10px 14px',
                        borderRadius: 8, fontSize: 14, marginBottom: 20, textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {!showRegister ? (
                    <>
                        <div className="form-group">
                            <label>Kullanıcı Adı</label>
                            <input
                                value={form.username}
                                onChange={e => setForm({ ...form, username: e.target.value })}
                                placeholder="admin"
                                onKeyDown={e => e.key === 'Enter' && login()}
                            />
                        </div>
                        <div className="form-group">
                            <label>Şifre</label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                placeholder="••••••••"
                                onKeyDown={e => e.key === 'Enter' && login()}
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 8 }}
                            onClick={login}
                            disabled={loading}
                        >
                            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                        </button>
                        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
                            Hesabınız yok mu?{' '}
                            <span style={{ color: '#1a56db', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => { setShowRegister(true); setError('') }}>
                                Kayıt Ol
                            </span>
                        </p>
                    </>
                ) : (
                    <>
                        <div className="form-group">
                            <label>Kullanıcı Adı</label>
                            <input value={regForm.username} onChange={e => setRegForm({ ...regForm, username: e.target.value })} placeholder="admin" />
                        </div>
                        <div className="form-group">
                            <label>Şifre</label>
                            <input type="password" value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })} placeholder="••••••••" />
                        </div>
                        <div className="form-group">
                            <label>Şifre Tekrar</label>
                            <input type="password" value={regForm.password2} onChange={e => setRegForm({ ...regForm, password2: e.target.value })} placeholder="••••••••" />
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 8 }}
                            onClick={register}
                            disabled={loading}
                        >
                            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
                        </button>
                        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
                            Zaten hesabınız var mı?{' '}
                            <span style={{ color: '#1a56db', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => { setShowRegister(false); setError('') }}>
                                Giriş Yap
                            </span>
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}