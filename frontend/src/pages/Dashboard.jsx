import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API from '../api'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, LineChart, Line, PieChart,
    Pie, Cell, AreaChart, Area
} from 'recharts'

const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
const COLORS = ['#1a56db', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4']

export default function Dashboard() {
    const [data, setData] = useState(null)
    const [customers, setCustomers] = useState([])
    const [debts, setDebts] = useState([])
    const [payments, setPayments] = useState([])
    const [stockStats, setStockStats] = useState(null)
    const [stockProducts, setStockProducts] = useState([])
    const [financeSummary, setFinanceSummary] = useState(null)
    const [financeTransactions, setFinanceTransactions] = useState([])
    const [sendingAll, setSendingAll] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        axios.get(`${API}/dashboard/`).then(r => setData(r.data))
        axios.get(`${API}/customers/`).then(r => setCustomers(r.data))
        axios.get(`${API}/debts/`).then(r => setDebts(r.data))
        axios.get(`${API}/payments/`).then(r => setPayments(r.data))
        axios.get(`${API}/stock/stats`).then(r => setStockStats(r.data))
        axios.get(`${API}/stock/products`).then(r => setStockProducts(r.data))
        axios.get(`${API}/finance/summary`).then(r => setFinanceSummary(r.data))
        axios.get(`${API}/finance/`).then(r => setFinanceTransactions(r.data))
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

    const overdueCustomers = customers.filter(c => {
        const balance = getBalance(c.id)
        if (balance <= 0) return false
        if (!c.son_odeme_tarihi) return true
        return getDaysSince(c.son_odeme_tarihi) > 30
    }).sort((a, b) => getBalance(b.id) - getBalance(a.id))

    const debtPaymentChart = (() => {
        const months = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const label = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
            const month = d.getMonth()
            const year = d.getFullYear()
            const borc = debts.filter(x => { const dt = new Date(x.date); return dt.getMonth() === month && dt.getFullYear() === year }).reduce((s, x) => s + x.amount, 0)
            const odeme = payments.filter(x => { const dt = new Date(x.date); return dt.getMonth() === month && dt.getFullYear() === year }).reduce((s, x) => s + x.amount, 0)
            months.push({ label, Borç: Math.round(borc), Tahsilat: Math.round(odeme) })
        }
        return months
    })()

    const financeChart = (() => {
        const months = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const label = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
            const month = d.getMonth()
            const year = d.getFullYear()
            const gelir = financeTransactions.filter(x => { const dt = new Date(x.date); return x.type === 'gelir' && dt.getMonth() === month && dt.getFullYear() === year }).reduce((s, x) => s + x.amount, 0)
            const gider = financeTransactions.filter(x => { const dt = new Date(x.date); return x.type === 'gider' && dt.getMonth() === month && dt.getFullYear() === year }).reduce((s, x) => s + x.amount, 0)
            months.push({ label, Gelir: Math.round(gelir), Gider: Math.round(gider), 'Net Kar': Math.round(gelir - gider) })
        }
        return months
    })()

    const stockCategoryChart = (() => {
        const catMap = {}
        stockProducts.forEach(p => {
            const cat = p.category_name || 'Diğer'
            catMap[cat] = (catMap[cat] || 0) + p.stock_quantity * p.purchase_price
        })
        return Object.entries(catMap).map(([name, value]) => ({ name, value: Math.round(value) }))
    })()

    const topDebtors = customers
        .map(c => ({ ...c, balance: getBalance(c.id) }))
        .filter(c => c.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5)

    const sendAllNotifications = async () => {
        setSendingAll(true)
        try {
            const res = await axios.post(`${API}/notifications/send-overdue`)
            alert(res.data.message)
        } catch {
            alert('Bildirim gönderilemedi!')
        }
        setSendingAll(false)
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'white', border: '1px solid #e8f0fe', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(26,86,219,0.1)' }}>
                    <p style={{ fontWeight: 600, marginBottom: 6, color: '#111827' }}>{label}</p>
                    {payload.map((p, i) => (
                        <p key={i} style={{ color: p.color, fontSize: 13 }}>{p.name}: {fmt(p.value)}</p>
                    ))}
                </div>
            )
        }
        return null
    }

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
                    padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20 }}>⚠️</span>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--danger)' }}>
                                {overdueCustomers.length} müşterinin ödemesi gecikiyor!
                            </div>
                            <div style={{ fontSize: 13, color: '#9b1c1c' }}>
                                Toplam geciken: <strong>{fmt(overdueCustomers.reduce((s, c) => s + getBalance(c.id), 0))}</strong>
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-sm"
                        style={{ background: '#fef3c7', color: '#c27803', border: '1px solid #fcd34d', whiteSpace: 'nowrap' }}
                        onClick={sendAllNotifications} disabled={sendingAll}>
                        {sendingAll ? '...' : '📧 Tümüne Bildirim Gönder'}
                    </button>
                </div>
            )}

            {/* Ana stat kartlar */}
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

            {/* Stok + Gelir/Gider özet */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">📦</div>
                    <div className="stat-label">Toplam Ürün</div>
                    <div className="stat-value primary">{stockStats?.toplam_urun || 0}</div>
                    {stockStats?.dusuk_stok > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                            ⚠️ {stockStats.dusuk_stok} ürün kritik stokta
                        </div>
                    )}
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">💼</div>
                    <div className="stat-label">Stok Değeri</div>
                    <div className="stat-value success">{stockStats ? fmt(stockStats.toplam_stok_degeri) : '—'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">📈</div>
                    <div className="stat-label">Toplam Gelir</div>
                    <div className="stat-value success">{financeSummary ? fmt(financeSummary.toplam_gelir) : '—'}</div>
                </div>
                <div className="stat-card" style={{ border: financeSummary?.net_kar >= 0 ? '2px solid #6ee7b7' : '2px solid #fca5a5' }}>
                    <div className={`stat-icon ${financeSummary?.net_kar >= 0 ? 'green' : 'red'}`}>
                        {financeSummary?.net_kar >= 0 ? '✅' : '❌'}
                    </div>
                    <div className="stat-label">Net Kar</div>
                    <div className={`stat-value ${financeSummary?.net_kar >= 0 ? 'success' : 'danger'}`}>
                        {financeSummary ? fmt(financeSummary.net_kar) : '—'}
                    </div>
                </div>
            </div>

            {/* Grafikler */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div className="card">
                    <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Son 6 Ay — Borç & Tahsilat</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={debtPaymentChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="Borç" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Tahsilat" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Takip Listesi</h3>
                    {topDebtors.length === 0 ? (
                        <div className="empty-state" style={{ padding: 32 }}>
                            <div className="icon">🎉</div>
                            <p>Bekleyen borç yok</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {topDebtors.map((c, i) => (
                                <div key={c.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div className="card">
                    <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Son 6 Ay — Gelir & Gider</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={financeChart}>
                            <defs>
                                <linearGradient id="gelirGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="giderGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area type="monotone" dataKey="Gelir" stroke="#10b981" fill="url(#gelirGrad)" strokeWidth={2} />
                            <Area type="monotone" dataKey="Gider" stroke="#ef4444" fill="url(#giderGrad)" strokeWidth={2} />
                            <Line type="monotone" dataKey="Net Kar" stroke="#1a56db" strokeWidth={2} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Stok Değeri — Kategori Dağılımı</h3>
                    {stockCategoryChart.length === 0 ? (
                        <div className="empty-state" style={{ padding: 32 }}>
                            <div className="icon">📦</div>
                            <p>Stok verisi yok</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <ResponsiveContainer width="60%" height={200}>
                                <PieChart>
                                    <Pie data={stockCategoryChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                        {stockCategoryChart.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => fmt(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ flex: 1 }}>
                                {stockCategoryChart.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                                        <div style={{ flex: 1, fontSize: 13, color: '#374151' }}>{item.name}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmt(item.value)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Geciken ödemeler tablosu */}
            {overdueCustomers.length > 0 && (
                <div className="card" style={{ border: '1px solid #fca5a5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--danger)' }}>
                            ⚠️ Geciken Ödemeler ({overdueCustomers.length} müşteri)
                        </h3>
                        <button className="btn btn-sm"
                            style={{ background: '#fef3c7', color: '#c27803', border: '1px solid #fcd34d' }}
                            onClick={sendAllNotifications} disabled={sendingAll}>
                            {sendingAll ? '...' : '📧 Tümüne Bildirim Gönder'}
                        </button>
                    </div>
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
                                    return (
                                        <tr key={c.id}>
                                            <td style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                                                onClick={() => navigate(`/customers/${c.id}`)}>
                                                {c.name}
                                            </td>
                                            <td>{c.phone || '-'}</td>
                                            <td style={{ fontSize: 13, color: '#6b7280' }}>
                                                {c.son_odeme_tarihi ? new Date(c.son_odeme_tarihi).toLocaleDateString('tr-TR') : 'Hiç ödeme yok'}
                                            </td>
                                            <td>
                                                {days !== null
                                                    ? <span className="badge badge-danger">{days} gün</span>
                                                    : <span className="badge badge-warning">Ödeme yok</span>}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                                                {fmt(getBalance(c.id))}
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
                                                    : <span className="badge badge-success">{tx.method === 'banka' ? '🏦 Banka' : '💵 Nakit'}</span>}
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