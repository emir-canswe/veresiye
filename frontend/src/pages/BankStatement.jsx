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
            <div className="page-header">
                <div>
                    <h1 className="page-title">Akıllı Ödeme</h1>
                    <p className="page-subtitle">
                        {transactions.length} işlem · {matched.length} eşleşti · {unmatched.length} bekliyor
                    </p>
                </div>
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    {uploading ? 'Yükleniyor...' : '📂 Ekstre Yükle'}
                    <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={upload} style={{ display: 'none' }} />
                </label>
            </div>

            <div className="info-box">
                💡 Sistem <strong>7 farklı algoritma</strong> ile eşleştirme yapar: IBAN, isim benzerliği, telefon, açıklama analizi, tutar eşleşmesi ve geçmiş öğrenimi. <strong>%85+</strong> güven skorunda otomatik eşleştirir.
            </div>

            {/* Eşleşmeyi bekleyenler */}
            {unmatched.length > 0 && (
                <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                    <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600, color: 'var(--warning)' }}>
                        ⏳ Eşleştirilmesi Gerekenler ({unmatched.length})
                    </h3>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Gönderen</th>
                                    <th>IBAN</th>
                                    <th>Tutar</th>
                                    <th>Açıklama</th>
                                    <th>Eşleştir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unmatched.map(tx => (
                                    <>
                                        <tr key={tx.id}>
                                            <td style={{ fontSize: 13, color: '#6b7280' }}>{new Date(tx.date).toLocaleDateString('tr-TR')}</td>
                                            <td style={{ fontWeight: 500 }}>{tx.sender_name || '-'}</td>
                                            <td style={{ fontSize: 12, color: '#6b7280' }}>{tx.sender_iban || '-'}</td>
                                            <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(tx.amount)}</span></td>
                                            <td style={{ fontSize: 13 }}>{tx.description || '-'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                    <select
                                                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
                                                        defaultValue=""
                                                        onChange={e => e.target.value && match(tx.id, e.target.value)}
                                                    >
                                                        <option value="">Manuel seç...</option>
                                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                    <button
                                                        className="btn btn-outline btn-sm"
                                                        onClick={() => getSuggestions(tx.id)}
                                                        disabled={loadingSuggestion === tx.id}
                                                        style={{ whiteSpace: 'nowrap' }}
                                                    >
                                                        {loadingSuggestion === tx.id ? '...' : '🤖 Öneri'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Öneri satırı */}
                                        {suggestions[tx.id] && (
                                            <tr key={`sug-${tx.id}`}>
                                                <td colSpan={6} style={{ background: '#f8fafc', padding: '12px 16px' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>
                                                        🤖 Algoritma Önerileri:
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                        {suggestions[tx.id].length === 0 ? (
                                                            <span style={{ fontSize: 13, color: '#9ca3af' }}>Öneri bulunamadı</span>
                                                        ) : (
                                                            suggestions[tx.id].map((s, i) => (
                                                                <div key={i} style={{
                                                                    background: 'white', border: '1px solid #e8f0fe',
                                                                    borderRadius: 10, padding: '10px 14px',
                                                                    display: 'flex', alignItems: 'center', gap: 10
                                                                }}>
                                                                    <div>
                                                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                                                                            {s.customer_name}
                                                                        </div>
                                                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                                                            {s.method}
                                                                        </div>
                                                                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                                                            {s.details}
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'center' }}>
                                                                        <div style={{
                                                                            background: confidenceBg(s.confidence),
                                                                            color: confidenceColor(s.confidence),
                                                                            borderRadius: 999, padding: '2px 10px',
                                                                            fontSize: 12, fontWeight: 700, marginBottom: 6
                                                                        }}>
                                                                            %{s.confidence}
                                                                        </div>
                                                                        <button
                                                                            className="btn btn-primary btn-sm"
                                                                            onClick={() => match(tx.id, s.customer_id)}
                                                                        >
                                                                            Seç
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Eşleşenler */}
            <div className="card">
                <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
                    ✅ Eşleştirilmiş İşlemler ({matched.length})
                </h3>
                {matched.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">🏦</div>
                        <p>Henüz eşleştirilmiş işlem yok</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Müşteri</th>
                                    <th>Gönderen IBAN</th>
                                    <th>Tutar</th>
                                    <th>Açıklama</th>
                                    <th>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matched.map(tx => (
                                    <tr key={tx.id}>
                                        <td style={{ fontSize: 13, color: '#6b7280' }}>{new Date(tx.date).toLocaleDateString('tr-TR')}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{getCustomerName(tx.matched_customer_id)}</td>
                                        <td style={{ fontSize: 12, color: '#6b7280' }}>{tx.sender_iban || '-'}</td>
                                        <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(tx.amount)}</span></td>
                                        <td style={{ fontSize: 13 }}>{tx.description || '-'}</td>
                                        <td>
                                            <button
                                                className="btn btn-sm"
                                                style={{ background: '#d1fae5', color: 'var(--success)' }}
                                                disabled={converting === tx.id}
                                                onClick={() => convertToPayment(tx.id)}
                                            >
                                                {converting === tx.id ? '...' : '💰 Ödemeye Dönüştür'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {transactions.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <div className="icon">🏦</div>
                        <p>Henüz ekstre yüklenmedi</p>
                        <p style={{ fontSize: 13, marginTop: 8 }}>PDF, Excel veya CSV formatında banka ekstrenizi yükleyin</p>
                    </div>
                </div>
            )}
        </div>
    )
}