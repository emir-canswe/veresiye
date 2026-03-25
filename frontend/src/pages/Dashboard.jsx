import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

import API from '../api'
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function Dashboard() {
    const [data, setData] = useState(null)
    const [customers, setCustomers] = useState([])
    const [debts, setDebts] = useState([])
    const [payments, setPayments] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        axios.get(`${API}/dashboard/`).then(r => setData(r.data))
        axios.get(`${API}/customers/`).then(r => setCustomers(r.data))
        axios.get(`${API}/debts/`).then(r => setDebts(r.data))
        axios.get(`${API}/payments/`).then(r => setPayments(r.data))
    }, [])

    const getBalance = (customerId) => {
        const totalDebt = debts.filter(d => d.customer_id === customerId).reduce((s, d) => s + d.amount, 0)
        const totalPayment = payments.filter(p => p.customer_id === customerId).reduce((s, p) => s + p.amount, 0)
        return totalDebt - totalPayment
    }

    const getDaysSince = (dateStr) => {
        if (!dateStr) return null
        return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24))
    }

    // Geciken ödemeler: borcu var + son ödeme üzerinden 30 gün geçmiş VEYA hiç ödeme yapmamış + borcu var
    const overdueCustomers = customers.filter(c => {
        const balance = getBalance(c.id)
        if (balance <= 0) return false
        if (!c.son_odeme_tarihi) return true // Hiç ödeme yapmamış ama borcu var
        const days = getDaysSince(c.son_odeme_tarihi)
        return days > 30
    }).sort((a, b) => getBalance(b.id) - getBalance(a.id))

    // Son 6 ay grafik verisi
    const chartData = (() => {
        const months = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const label = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
            const month = d.getMonth()
            const year = d.getFullYear()
            const borc = debts.filter(x => { const dt = new Date(x.date); return dt.getMonth() === month && dt.getFullYear() === year }).reduce((s, x) => s + x.amount, 0)
            const odeme = payments.filter(x => { const dt = new Date(x.date); return dt.getMonth() === month && dt.getFullYear() === year }).reduce((s, x) => s + x.amount, 0)
            months.push({ label, Borç: Math.round(borc), Ödeme: Math.round(odeme) })
        }
        return months
    })()

    // Kritik Hesaplar
    const topDebtors = customers
        .map(c => ({ ...c, balance: getBalance(c.id) }))
        .filter(c => c.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5)

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Finansal durumunuza genel bakış</p>
                </div>
            </div>

            {/* Geciken ödeme uyarısı */}
            {overdueCustomers.length > 0 && (
                <div style={{
                    background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 12,
                    padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12
                }}>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: 15 }}>
                            {overdueCustomers.length} müşterinin ödemesi gecikiyor!
                        </div>
                        <div style={{ fontSize: 13, color: '#9b1c1c', marginTop: 2 }}>
                            Toplam geciken tutar: <strong>{fmt(overdueCustomers.reduce((s, c) => s + getBalance(c.id), 0))}</strong>
                        </div>
                    </div>
                </div>
            )}

            {/* Stat kartlar */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon red">📋</div>
                    <div className="stat-label">Toplam Alacak</div>
                    <div className="stat-value danger">{data ? fmt(data.toplam_alacak) : '—'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">💰</div>
                    <div className="stat-label">Toplam Tahsilat</div>
                    <div className="stat-value success">{data ? fmt(data.toplam_tahsilat) : '—'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow">⏳</div>
                    <div className="stat-label">Bekleyen Borç</div>
                    <div className="stat-value warning">{data ? fmt(data.bekleyen_borc) : '—'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue">👥</div>
                    <div className="stat-label">Toplam Müşteri</div>
                    <div className="stat-value primary">{customers.length}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div className="card">
                    <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Son 6 Ay — Borç & Tahsilat</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
                            <Tooltip formatter={(v) => fmt(v)} />
                            <Legend />
                            <Bar dataKey="Borç" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Ödeme" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card">
                    <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Kritik Hesaplar</h3>
                    {topDebtors.length === 0 ? (
                        <div className="empty-state" style={{ padding: 32 }}>
                            <div className="icon">🎉</div>
                            <p>Bekleyen borç yok</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {topDebtors.map((c, i) => (
                                <div key={c.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}
                                    onClick={() => navigate(`/customers/${c.id}`)}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: i === 0 ? '#fef3c7' : '#f3f4f6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 14, fontWeight: 700,
                                        color: i === 0 ? '#92400e' : '#6b7280', flexShrink: 0
                                    }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--primary)' }}>{c.name}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                                            {c.son_odeme_tarihi
                                                ? `Son ödeme: ${new Date(c.son_odeme_tarihi).toLocaleDateString('tr-TR')}`
                                                : 'Hiç ödeme yapılmadı'}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 15 }}>{fmt(c.balance)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Geciken ödemeler tablosu */}
            {overdueCustomers.length > 0 && (
                <div className="card" style={{ border: '1px solid #fca5a5' }}>
                    <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, color: 'var(--danger)' }}>
                        ⚠️ Geciken Ödemeler ({overdueCustomers.length} müşteri)
                    </h3>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Müşteri</th>
                                    <th>Telefon</th>
                                    <th>Son Ödeme</th>
                                    <th>Gecikme</th>
                                    <th style={{ textAlign: 'right' }}>Kalan Borç</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {overdueCustomers.map(c => {
                                    const days = getDaysSince(c.son_odeme_tarihi)
                                    const balance = getBalance(c.id)
                                    return (
                                        <tr key={c.id}>
                                            <td style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                                                onClick={() => navigate(`/customers/${c.id}`)}>
                                                {c.name}
                                            </td>
                                            <td>{c.phone || '-'}</td>
                                            <td style={{ fontSize: 13, color: '#6b7280' }}>
                                                {c.son_odeme_tarihi
                                                    ? new Date(c.son_odeme_tarihi).toLocaleDateString('tr-TR')
                                                    : 'Hiç ödeme yok'}
                                            </td>
                                            <td>
                                                {days !== null ? (
                                                    <span className="badge badge-danger">{days} gün</span>
                                                ) : (
                                                    <span className="badge badge-warning">Ödeme yok</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                                                {fmt(balance)}
                                            </td>
                                            <td>
                                                <button className="btn btn-outline btn-sm"
                                                    onClick={() => navigate(`/customers/${c.id}`)}>
                                                    Detay
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Son işlemler */}
            <div className="card">
                <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Son İşlemler</h3>
                {debts.length === 0 && payments.length === 0 ? (
                    <div className="empty-state"><div className="icon">📄</div><p>Henüz işlem yok</p></div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Müşteri</th>
                                    <th>Tür</th>
                                    <th style={{ textAlign: 'right' }}>Tutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ...debts.map(d => ({ ...d, type: 'debt' })),
                                    ...payments.map(p => ({ ...p, type: 'payment' }))
                                ]
                                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                                    .slice(0, 8)
                                    .map(tx => (
                                        <tr key={`${tx.type}-${tx.id}`} style={{ cursor: 'pointer' }}
                                            onClick={() => navigate(`/customers/${tx.customer_id}`)}>
                                            <td style={{ color: '#6b7280', fontSize: 13 }}>{new Date(tx.date).toLocaleDateString('tr-TR')}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                {customers.find(c => c.id === tx.customer_id)?.name || '-'}
                                            </td>
                                            <td>
                                                {tx.type === 'debt'
                                                    ? <span className="badge badge-danger">Borç</span>
                                                    : <span className="badge badge-success">{tx.method === 'banka' ? '🏦 Banka' : '💵 Nakit'}</span>
                                                }
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: tx.type === 'debt' ? 'var(--danger)' : 'var(--success)' }}>
                                                {tx.type === 'debt' ? '+' : '-'}{fmt(tx.amount)}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}