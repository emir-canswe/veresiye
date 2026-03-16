import { useEffect, useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

export default function Settings({ user, onLogout }) {
    const [stats, setStats] = useState(null)

    useEffect(() => {
        axios.get(`${API}/backup/stats`).then(r => setStats(r.data))
    }, [])

    const downloadBackup = async () => {
        const res = await axios.get(`${API}/backup/export`, { responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([res.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = `veresiye_yedek_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.json`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Ayarlar</h1>
                    <p className="page-subtitle">Hesap ve yedekleme ayarları</p>
                </div>
            </div>

            {/* Kullanıcı bilgisi */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>👤 Hesap Bilgileri</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.username}</div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                            <span className={`badge ${user?.role === 'admin' ? 'badge-info' : 'badge-gray'}`}>
                                {user?.role === 'admin' ? '👑 Admin' : '👤 Çalışan'}
                            </span>
                        </div>
                    </div>
                    <button className="btn btn-danger" onClick={onLogout}>Çıkış Yap</button>
                </div>
            </div>

            {/* Veritabanı istatistikleri */}
            {stats && (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                    <div className="stat-card">
                        <div className="stat-icon blue">👥</div>
                        <div className="stat-label">Müşteri</div>
                        <div className="stat-value primary">{stats.musteri_sayisi}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon red">📋</div>
                        <div className="stat-label">Borç Kaydı</div>
                        <div className="stat-value danger">{stats.borc_sayisi}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green">💰</div>
                        <div className="stat-label">Ödeme Kaydı</div>
                        <div className="stat-value success">{stats.odeme_sayisi}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon yellow">🏦</div>
                        <div className="stat-label">Banka İşlemi</div>
                        <div className="stat-value warning">{stats.banka_islemi_sayisi}</div>
                    </div>
                </div>
            )}

            {/* Yedekleme */}
            <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>💾 Veri Yedekleme</h3>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
                    Tüm verilerinizi JSON formatında indirin. Düzenli yedek almanız önerilir.
                </p>
                <button className="btn btn-primary" onClick={downloadBackup}>
                    ⬇️ Yedeği İndir
                </button>
            </div>
        </div>
    )
}