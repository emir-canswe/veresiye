import { useEffect, useState } from 'react'
import axios from 'axios'
import API from '../api'

const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function BankStatement() {
    const [transactions, setTransactions] = useState([])
    const [customers, setCustomers] = useState([])
    const [uploading, setUploading] = useState(false)
    const [converting, setConverting] = useState(null)
    const [suggestions, setSuggestions] = useState({})
    const [loadingSuggestion, setLoadingSuggestion] = useState(null)
    const [activeTab, setActiveTab] = useState('unmatched')

    const load = () => {
        axios.get(`${API}/bank/transactions`).then(r => setTransactions(r.data))
        axios.get(`${API}/customers/`).then(r => setCustomers(r.data))
    }

    useEffect(() => { load() }, [])

    const upload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        setUploading(true)
        const fd = new FormData()
        fd.append('file', file)
        try {
            await axios.post(`${API}/bank/upload`, fd)
            load()
        } catch {
            alert('Dosya yüklenirken hata oluştu.')
        }
        setUploading(false)
        e.target.value = ''
    }

    const match = async (txId, customerId) => {
        await axios.post(`${API}/bank/transactions/${txId}/match`, { customer_id: parseInt(customerId) })
        setSuggestions(prev => { const s = { ...prev }; delete s[txId]; return s })
        load()
    }

    const getSuggestions = async (txId) => {
        setLoadingSuggestion(txId)
        try {
            const res = await axios.get(`${API}/bank/transactions/${txId}/suggestions`)
            setSuggestions(prev => ({ ...prev, [txId]: res.data }))
        } catch {
            alert('Öneri alınamadı')
        }
        setLoadingSuggestion(null)
    }

    const convertToPayment = async (txId) => {
        setConverting(txId)
        try {
            await axios.post(`${API}/bank/transactions/${txId}/convert`)
            load()
        } catch (e) {
            alert(e.response?.data?.detail || 'Hata oluştu')
        }
        setConverting(null)
    }

    const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-'

    const matched = transactions.filter(t => t.is_matched)
    const unmatched = transactions.filter(t => !t.is_matched)

    const confidenceColor = (score) => {
        if (score >= 90) return '#057a55'
        if (score >= 75) return '#c27803'
        return '#e02424'
    }

    const confidenceBg = (score) => {
        if (score >= 90) return '#def7ec'
        if (score >= 75) return '#fdf6b2'
        return '#fde8e8'
    }

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Akıllı Ödeme</h1>
                    <p className="page-subtitle">
                        Banka ekstrelerinizi yükleyin, sistem otomatik eşleştirsin
                    </p>
                </div>
                <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                    color: 'white', padding: '10px 22px', borderRadius: 10,
                    cursor: 'pointer', fontWeight: 600, fontSize: 14,
                    boxShadow: '0 4px 12px rgba(26,86,219,0.3)', transition: 'all 0.18s'
                }}>
                    {uploading ? '⏳ Yükleniyor...' : '📂 Ekstre Yükle'}
                    <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={upload} style={{ display: 'none' }} />
                </label>
            </div>

            {/* İstatistik kartlar */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon blue">🏦</div>
                    <div className="stat-label">Toplam İşlem</div>
                    <div className="stat-value primary">{transactions.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-label">Eşleştirildi</div>
                    <div className="stat-value success">{matched.length}</div>
                </div>
                <div className="stat-card" style={{ border: unmatched.length > 0 ? '2px solid #fca5a5' : '1px solid #e8f0fe' }}>
                    <div className="stat-icon yellow">⏳</div>
                    <div className="stat-label">Bekliyor</div>
                    <div className={`stat-value ${unmatched.length > 0 ? 'danger' : 'primary'}`}>{unmatched.length}</div>
                </div>
            </div>

            {/* Algoritma bilgi kutusu */}
            <div style={{
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                border: '1px solid #bfdbfe', borderRadius: 14,
                padding: '16px 20px', marginBottom: 24,
                display: 'flex', alignItems: 'center', gap: 14
            }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: '#1a56db', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0
                }}>🤖</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a8a', marginBottom: 4 }}>
                        7 Katmanlı Akıllı Eşleştirme Sistemi
                    </div>
                    <div style={{ fontSize: 13, color: '#1d4ed8', lineHeight: 1.6 }}>
                        <strong>IBAN</strong> · <strong>İsim benzerliği</strong> · <strong>Telefon</strong> · <strong>Açıklama analizi</strong> · <strong>Tutar eşleşmesi</strong> · <strong>Geçmiş öğrenimi</strong> — %85+ güvende otomatik eşleştirir
                    </div>
                </div>
            </div>

            {/* Tab */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 5, borderRadius: 12, border: '1px solid var(--border)', width: 'fit-content' }}>
                {[
                    { id: 'unmatched', label: `⏳ Bekleyenler (${unmatched.length})` },
                    { id: 'matched', label: `✅ Eşleşenler (${matched.length})` }
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: activeTab === t.id ? 'var(--primary)' : 'transparent',
                        color: activeTab === t.id ? 'white' : '#6b7280',
                        fontWeight: activeTab === t.id ? 700 : 500, fontSize: 14, transition: 'all 0.15s'
                    }}>{t.label}</button>
                ))}
            </div>

            {/* Bekleyenler */}
            {activeTab === 'unmatched' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {unmatched.length === 0 ? (
                        <div className="empty-state" style={{ padding: 60 }}>
                            <div className="icon">🎉</div>
                            <p style={{ fontWeight: 600, color: '#111827', fontSize: 16 }}>Tüm işlemler eşleştirildi!</p>
                            <p style={{ fontSize: 13, marginTop: 8 }}>Yeni ekstre yükleyebilirsiniz.</p>
                        </div>
                    ) : (
                        <div>
                            {unmatched.map((tx, idx) => (
                                <div key={tx.id}>
                                    <div style={{
                                        padding: '16px 24px',
                                        background: idx % 2 === 0 ? 'white' : '#fafbff',
                                        borderBottom: '1px solid #f1f5f9'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                                            {/* Sol - işlem bilgisi */}
                                            <div style={{
                                                width: 44, height: 44, borderRadius: 12,
                                                background: '#fef3c7', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                fontSize: 20, flexShrink: 0
                                            }}>🏦</div>

                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                                                        {tx.sender_name || 'Bilinmiyor'}
                                                    </span>
                                                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>
                                                        {fmt(tx.amount)}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                                        {new Date(tx.date).toLocaleDateString('tr-TR')}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                                    {tx.sender_iban && (
                                                        <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace', background: '#f8fafc', padding: '2px 8px', borderRadius: 6 }}>
                                                            {tx.sender_iban}
                                                        </span>
                                                    )}
                                                    {tx.description && (
                                                        <span style={{ fontSize: 12, color: '#6b7280' }}>📝 {tx.description}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sağ - eşleştirme */}
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                                                <select
                                                    style={{
                                                        padding: '8px 12px', borderRadius: 8,
                                                        border: '1.5px solid #e2e8f0', fontSize: 13,
                                                        background: 'white', color: '#374151', cursor: 'pointer'
                                                    }}
                                                    defaultValue=""
                                                    onChange={e => e.target.value && match(tx.id, e.target.value)}
                                                >
                                                    <option value="">Manuel seç...</option>
                                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <button
                                                    onClick={() => getSuggestions(tx.id)}
                                                    disabled={loadingSuggestion === tx.id}
                                                    style={{
                                                        padding: '8px 14px', borderRadius: 8,
                                                        border: 'none', cursor: 'pointer', fontWeight: 600,
                                                        fontSize: 13, background: '#1a56db', color: 'white',
                                                        boxShadow: '0 2px 8px rgba(26,86,219,0.25)', transition: 'all 0.15s',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {loadingSuggestion === tx.id ? '⏳' : '🤖 Öneri Al'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Öneri sonuçları */}
                                        {suggestions[tx.id] && (
                                            <div style={{
                                                marginTop: 16, padding: '14px 16px',
                                                background: '#f8fafc', borderRadius: 10,
                                                border: '1px solid #e8f0fe'
                                            }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                                                    🤖 Algoritma Önerileri:
                                                </div>
                                                {suggestions[tx.id].length === 0 ? (
                                                    <span style={{ fontSize: 13, color: '#9ca3af' }}>Eşleşen müşteri bulunamadı</span>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                        {suggestions[tx.id].map((s, i) => (
                                                            <div key={i} style={{
                                                                background: 'white', border: '1.5px solid #e8f0fe',
                                                                borderRadius: 12, padding: '12px 16px',
                                                                display: 'flex', alignItems: 'center', gap: 14,
                                                                boxShadow: '0 2px 8px rgba(26,86,219,0.06)',
                                                                minWidth: 220
                                                            }}>
                                                                <div style={{
                                                                    width: 40, height: 40, borderRadius: '50%',
                                                                    background: 'var(--primary)', display: 'flex',
                                                                    alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0
                                                                }}>
                                                                    {s.customer_name?.[0]?.toUpperCase()}
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                                                                        {s.customer_name}
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                                                        {s.method}
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                                                        {s.details}
                                                                    </div>
                                                                </div>
                                                                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                                                                    <div style={{
                                                                        background: confidenceBg(s.confidence),
                                                                        color: confidenceColor(s.confidence),
                                                                        borderRadius: 999, padding: '3px 10px',
                                                                        fontSize: 13, fontWeight: 800, marginBottom: 8
                                                                    }}>
                                                                        %{s.confidence}
                                                                    </div>
                                                                    <button onClick={() => match(tx.id, s.customer_id)} style={{
                                                                        padding: '6px 14px', borderRadius: 7, border: 'none',
                                                                        cursor: 'pointer', fontWeight: 600, fontSize: 12,
                                                                        background: 'var(--primary)', color: 'white'
                                                                    }}>
                                                                        Seç ✓
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Eşleşenler */}
            {activeTab === 'matched' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {matched.length === 0 ? (
                        <div className="empty-state" style={{ padding: 60 }}>
                            <div className="icon">🏦</div>
                            <p>Henüz eşleştirilmiş işlem yok</p>
                        </div>
                    ) : (
                        <div>
                            {matched.map((tx, idx) => (
                                <div key={tx.id} style={{
                                    padding: '16px 24px',
                                    background: idx % 2 === 0 ? 'white' : '#fafbff',
                                    borderBottom: '1px solid #f1f5f9',
                                    display: 'flex', alignItems: 'center', gap: 16
                                }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12,
                                        background: '#def7ec', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, flexShrink: 0
                                    }}>✅</div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>
                                                {getCustomerName(tx.matched_customer_id)}
                                            </span>
                                            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>
                                                {fmt(tx.amount)}
                                            </span>
                                            <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                                {new Date(tx.date).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            {tx.sender_iban && (
                                                <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace', background: '#f8fafc', padding: '2px 8px', borderRadius: 6 }}>
                                                    {tx.sender_iban}
                                                </span>
                                            )}
                                            {tx.sender_name && (
                                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                                    👤 {tx.sender_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        disabled={converting === tx.id}
                                        onClick={() => convertToPayment(tx.id)}
                                        style={{
                                            padding: '9px 18px', borderRadius: 9, border: 'none',
                                            cursor: converting === tx.id ? 'not-allowed' : 'pointer',
                                            fontWeight: 600, fontSize: 13,
                                            background: converting === tx.id ? '#f3f4f6' : '#def7ec',
                                            color: converting === tx.id ? '#9ca3af' : 'var(--success)',
                                            transition: 'all 0.15s', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {converting === tx.id ? '...' : '💰 Ödemeye Dönüştür'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {transactions.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>🏦</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                        Henüz ekstre yüklenmedi
                    </h3>
                    <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                        PDF, Excel veya CSV formatında banka ekstrenizi yükleyin
                    </p>
                    <label style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'var(--primary)', color: 'white',
                        padding: '11px 24px', borderRadius: 10, cursor: 'pointer',
                        fontWeight: 600, fontSize: 14
                    }}>
                        📂 Ekstre Yükle
                        <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={upload} style={{ display: 'none' }} />
                    </label>
                </div>
            )}
        </div>
    )
}