import { useEffect, useState } from 'react'
import axios from 'axios'
import API from '../api'

function UserManagement() {
    const [users, setUsers] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ username: '', password: '', role: 'calisan' })
    const [msg, setMsg] = useState(null)

    const load = () => {
        const token = localStorage.getItem('token')
        axios.get(`${API}/auth/users`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => setUsers(r.data))
    }

    useEffect(() => { load() }, [])

    const save = async () => {
        try {
            const token = localStorage.getItem('token')
            await axios.post(`${API}/auth/users`, form, { headers: { Authorization: `Bearer ${token}` } })
            setShowModal(false)
            setForm({ username: '', password: '', role: 'calisan' })
            setMsg({ type: 'success', text: 'Kullanıcı oluşturuldu!' })
            load()
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.detail || 'Hata oluştu!' })
        }
    }

    const remove = async (id) => {
        if (confirm('Kullanıcıyı silmek istediğinize emin misiniz?')) {
            const token = localStorage.getItem('token')
            await axios.delete(`${API}/auth/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            load()
        }
    }

    const roleLabel = (role) => {
        if (role === 'admin') return <span className="badge badge-info">👑 Admin</span>
        if (role === 'muhasebeci') return <span className="badge badge-warning">📊 Muhasebeci</span>
        return <span className="badge badge-gray">👤 Çalışan</span>
    }

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Kullanıcı Yönetimi</h3>
                    <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Sisteme erişebilecek kullanıcıları yönetin.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Yeni Kullanıcı</button>
            </div>

            {msg && (
                <div style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500,
                    background: msg.type === 'success' ? '#def7ec' : '#fde8e8',
                    color: msg.type === 'success' ? '#057a55' : '#e02424',
                    border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fca5a5'}`
                }}>
                    {msg.type === 'success' ? '✅' : '❌'} {msg.text}
                </div>
            )}

            <div style={{ marginBottom: 16, padding: 14, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: 13, color: '#1d4ed8', fontWeight: 500 }}>
                💡 <strong>Admin</strong> her şeyi yapabilir · <strong>Muhasebeci</strong> raporlar ve gelir/gideri görür · <strong>Çalışan</strong> müşteri, borç, stok işlemleri yapabilir
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Kullanıcı Adı</th>
                            <th>Rol</th>
                            <th>Kayıt Tarihi</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td style={{ fontWeight: 600 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: 'var(--primary)', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            fontSize: 13, fontWeight: 700, color: 'white'
                                        }}>
                                            {u.username?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        {u.username}
                                    </div>
                                </td>
                                <td>{roleLabel(u.role)}</td>
                                <td style={{ fontSize: 13, color: '#6b7280' }}>{new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
                                <td>
                                    <button className="btn btn-danger btn-sm" onClick={() => remove(u.id)}>Sil</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Yeni Kullanıcı Ekle</div>
                        <div className="form-group">
                            <label>Kullanıcı Adı *</label>
                            <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Kullanıcı adı" />
                        </div>
                        <div className="form-group">
                            <label>Şifre *</label>
                            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="En az 6 karakter" />
                        </div>
                        <div className="form-group">
                            <label>Rol *</label>
                            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                <option value="calisan">👤 Çalışan</option>
                                <option value="muhasebeci">📊 Muhasebeci</option>
                                <option value="admin">👑 Admin</option>
                            </select>
                        </div>
                        <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10, fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                            {form.role === 'calisan' && '👤 Çalışan: Müşteri, borç, ödeme ve stok işlemleri yapabilir.'}
                            {form.role === 'muhasebeci' && '📊 Muhasebeci: Dashboard, raporlar ve gelir/gider sayfalarını görüntüleyebilir.'}
                            {form.role === 'admin' && '👑 Admin: Tüm sayfalara erişebilir ve kullanıcı yönetimi yapabilir.'}
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={save} disabled={!form.username || !form.password}>Oluştur</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function Settings({ user, onLogout }) {
    const [stats, setStats] = useState(null)
    const [activeTab, setActiveTab] = useState('hesap')
    const [usernameForm, setUsernameForm] = useState({ newUsername: '' })
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [usernameMsg, setUsernameMsg] = useState(null)
    const [passwordMsg, setPasswordMsg] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        axios.get(`${API}/backup/stats`).then(r => setStats(r.data))
    }, [])

    const downloadBackup = async () => {
        const res = await axios.get(`${API}/backup/export`, { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = `tahsilat_yedek_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.json`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const changeUsername = async () => {
        if (!usernameForm.newUsername) return
        setLoading(true)
        setUsernameMsg(null)
        try {
            const token = localStorage.getItem('token')
            await axios.put(`${API}/auth/update-username`,
                { new_username: usernameForm.newUsername },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setUsernameMsg({ type: 'success', text: 'Kullanıcı adı güncellendi. Yeniden giriş yapılıyor...' })
            setTimeout(() => onLogout(), 2000)
        } catch (e) {
            setUsernameMsg({ type: 'error', text: e.response?.data?.detail || 'Hata oluştu!' })
        }
        setLoading(false)
    }

    const changePassword = async () => {
        if (!passwordForm.currentPassword || !passwordForm.newPassword) return
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'Yeni şifreler eşleşmiyor!' })
            return
        }
        if (passwordForm.newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Şifre en az 6 karakter olmalı!' })
            return
        }
        setLoading(true)
        setPasswordMsg(null)
        try {
            const token = localStorage.getItem('token')
            await axios.put(`${API}/auth/update-password`,
                { current_password: passwordForm.currentPassword, new_password: passwordForm.newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setPasswordMsg({ type: 'success', text: 'Şifre başarıyla güncellendi!' })
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (e) {
            setPasswordMsg({ type: 'error', text: e.response?.data?.detail || 'Mevcut şifre hatalı!' })
        }
        setLoading(false)
    }

    const getPasswordStrength = (pwd) => {
        if (!pwd) return { score: 0, label: '', color: '' }
        let score = 0
        if (pwd.length >= 6) score++
        if (pwd.length >= 8) score++
        if (/[A-Z]/.test(pwd)) score++
        if (/[0-9]/.test(pwd)) score++
        if (/[^A-Za-z0-9]/.test(pwd)) score++
        if (score <= 1) return { score, label: 'Çok Zayıf', color: '#ef4444' }
        if (score === 2) return { score, label: 'Zayıf', color: '#f97316' }
        if (score === 3) return { score, label: 'Orta', color: '#f59e0b' }
        if (score === 4) return { score, label: 'Güçlü', color: '#10b981' }
        return { score, label: 'Çok Güçlü', color: '#059669' }
    }

    const pwdStrength = getPasswordStrength(passwordForm.newPassword)

    const tabs = [
        { id: 'hesap', label: 'Hesap', icon: '👤' },
        { id: 'guvenlik', label: 'Güvenlik', icon: '🔒' },
        { id: 'yedek', label: 'Yedekleme', icon: '💾' },
        ...(user?.role === 'admin' ? [{ id: 'kullanicilar', label: 'Kullanıcılar', icon: '👥' }] : [])
    ]

    const Msg = ({ msg }) => msg ? (
        <div style={{
            padding: '11px 16px', borderRadius: 10, marginBottom: 18, fontSize: 13, fontWeight: 500,
            background: msg.type === 'success' ? '#def7ec' : '#fde8e8',
            color: msg.type === 'success' ? '#057a55' : '#e02424',
            border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
            display: 'flex', alignItems: 'center', gap: 8
        }}>
            {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
    ) : null

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Ayarlar</h1>
                    <p className="page-subtitle">Hesap ve uygulama yönetimi</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

                {/* Sol sidebar */}
                <div style={{ width: 240, flexShrink: 0 }}>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #1a56db 0%, #3b82f6 100%)',
                            padding: '24px 20px', textAlign: 'center'
                        }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)',
                                border: '2px solid rgba(255,255,255,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 24, fontWeight: 800, color: 'white',
                                margin: '0 auto 12px'
                            }}>
                                {user?.username?.[0]?.toUpperCase()}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>{user?.username}</div>
                            <div style={{
                                marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: 'rgba(255,255,255,0.2)', borderRadius: 999,
                                padding: '3px 10px', fontSize: 12, color: 'white', fontWeight: 500
                            }}>
                                {user?.role === 'admin' ? '👑 Admin' : user?.role === 'muhasebeci' ? '📊 Muhasebeci' : '👤 Çalışan'}
                            </div>
                        </div>

                        <div style={{ padding: '10px 8px' }}>
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                    background: activeTab === tab.id ? '#eff6ff' : 'transparent',
                                    color: activeTab === tab.id ? '#1a56db' : '#6b7280',
                                    fontWeight: activeTab === tab.id ? 700 : 500,
                                    fontSize: 14, marginBottom: 2, textAlign: 'left',
                                    transition: 'all 0.15s',
                                    borderLeft: activeTab === tab.id ? '3px solid #1a56db' : '3px solid transparent'
                                }}>
                                    <span style={{ fontSize: 16 }}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ padding: '0 8px 10px', borderTop: '1px solid #f1f5f9', marginTop: 4, paddingTop: 10 }}>
                            <button onClick={onLogout} style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: 'transparent', color: '#e02424',
                                fontSize: 14, fontWeight: 600, textAlign: 'left', transition: 'all 0.15s'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fde8e8'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontSize: 16 }}>🚪</span> Çıkış Yap
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sağ içerik */}
                <div style={{ flex: 1 }}>

                    {activeTab === 'hesap' && (
                        <div className="card">
                            <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: '#111827' }}>Hesap Bilgileri</h3>
                                <p style={{ fontSize: 13, color: '#6b7280' }}>Kullanıcı adınızı güncelleyebilirsiniz.</p>
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 16,
                                padding: '16px 20px', background: '#f8fafc',
                                borderRadius: 12, marginBottom: 24, border: '1px solid #e8f0fe'
                            }}>
                                <div style={{
                                    width: 50, height: 50, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 22, fontWeight: 800, color: 'white', flexShrink: 0
                                }}>
                                    {user?.username?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{user?.username}</div>
                                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                                        {user?.role === 'admin' ? '👑 Yönetici hesabı' : user?.role === 'muhasebeci' ? '📊 Muhasebeci hesabı' : '👤 Çalışan hesabı'}
                                    </div>
                                </div>
                            </div>
                            <Msg msg={usernameMsg} />
                            <div className="form-group">
                                <label>Yeni Kullanıcı Adı</label>
                                <input
                                    value={usernameForm.newUsername}
                                    onChange={e => setUsernameForm({ newUsername: e.target.value })}
                                    placeholder="Yeni kullanıcı adınızı girin"
                                    onKeyDown={e => e.key === 'Enter' && changeUsername()}
                                />
                            </div>
                            <button className="btn btn-primary" onClick={changeUsername}
                                disabled={!usernameForm.newUsername || loading}>
                                Kullanıcı Adını Güncelle
                            </button>
                        </div>
                    )}

                    {activeTab === 'guvenlik' && (
                        <div className="card">
                            <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: '#111827' }}>Şifre Değiştir</h3>
                                <p style={{ fontSize: 13, color: '#6b7280' }}>Hesabınızı güvende tutmak için güçlü bir şifre kullanın.</p>
                            </div>
                            <Msg msg={passwordMsg} />
                            <div className="form-group">
                                <label>Mevcut Şifre</label>
                                <input type="password" value={passwordForm.currentPassword}
                                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    placeholder="••••••••" />
                            </div>
                            <div className="form-group">
                                <label>Yeni Şifre</label>
                                <input type="password" value={passwordForm.newPassword}
                                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    placeholder="En az 6 karakter" />
                            </div>
                            {passwordForm.newPassword && (
                                <div style={{ marginTop: -10, marginBottom: 18 }}>
                                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} style={{
                                                height: 4, flex: 1, borderRadius: 4,
                                                background: i <= pwdStrength.score ? pwdStrength.color : '#e5e7eb',
                                                transition: 'background 0.2s'
                                            }} />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: 12, color: pwdStrength.color, fontWeight: 600 }}>
                                        {pwdStrength.label}
                                    </span>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Yeni Şifre Tekrar</label>
                                <input type="password" value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    placeholder="••••••••" />
                                {passwordForm.confirmPassword && (
                                    <div style={{
                                        fontSize: 12, marginTop: 5, fontWeight: 500,
                                        color: passwordForm.newPassword === passwordForm.confirmPassword ? '#057a55' : '#e02424'
                                    }}>
                                        {passwordForm.newPassword === passwordForm.confirmPassword ? '✅ Şifreler eşleşiyor' : '❌ Şifreler eşleşmiyor'}
                                    </div>
                                )}
                            </div>
                            <button className="btn btn-primary" onClick={changePassword}
                                disabled={!passwordForm.currentPassword || !passwordForm.newPassword || loading}>
                                🔒 Şifreyi Güncelle
                            </button>
                        </div>
                    )}

                    {activeTab === 'yedek' && (
                        <div>
                            {stats && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
                                    {[
                                        { icon: '👥', label: 'Müşteri', value: stats.musteri_sayisi, cls: 'primary', bg: '#dbeafe' },
                                        { icon: '📋', label: 'Borç Kaydı', value: stats.borc_sayisi, cls: 'danger', bg: '#fde8e8' },
                                        { icon: '💰', label: 'Ödeme Kaydı', value: stats.odeme_sayisi, cls: 'success', bg: '#def7ec' },
                                        { icon: '🏦', label: 'Banka İşlemi', value: stats.banka_islemi_sayisi, cls: 'warning', bg: '#fdf6b2' },
                                    ].map(s => (
                                        <div key={s.label} className="stat-card" style={{ padding: '18px 20px' }}>
                                            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 8 }}>{s.icon}</div>
                                            <div className="stat-label">{s.label}</div>
                                            <div className={`stat-value ${s.cls}`} style={{ fontSize: 24 }}>{s.value}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="card">
                                <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 14,
                                        background: '#dbeafe', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        fontSize: 24, flexShrink: 0
                                    }}>💾</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#111827' }}>Veri Yedeği İndir</div>
                                        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18, lineHeight: 1.7 }}>
                                            Tüm müşteri, borç ve ödeme verileriniz JSON formatında dışa aktarılır.
                                            Verilerinizi kaybetmemek için düzenli yedek almanız önerilir.
                                        </p>
                                        <button className="btn btn-primary" onClick={downloadBackup}>
                                            ⬇️ Yedeği İndir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'kullanicilar' && user?.role === 'admin' && (
                        <UserManagement />
                    )}

                </div>
            </div>
        </div>
    )
}