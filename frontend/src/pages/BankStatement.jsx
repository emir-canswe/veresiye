import { useEffect, useState } from 'react'
import axios from 'axios'
import API from '../api'
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function BankStatement() {
    const [transactions, setTransactions] = useState([])
    const [customers, setCustomers] = useState([])
    const [uploading, setUploading] = useState(false)
    const [converting, setConverting] = useState(null)

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
        load()
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

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Banka Ekstresi</h1>
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
                💡 Banka ekstrenizi yükleyin → sistem otomatik eşleştirsin → <strong>Ödemeye Dönüştür</strong> butonuyla ödeme kaydı oluşturun.
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
                                    <th>Müşteri Eşleştir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unmatched.map(tx => (
                                    <tr key={tx.id}>
                                        <td style={{ fontSize: 13, color: '#6b7280' }}>{new Date(tx.date).toLocaleDateString('tr-TR')}</td>
                                        <td style={{ fontWeight: 500 }}>{tx.sender_name || '-'}</td>
                                        <td style={{ fontSize: 12, color: '#6b7280' }}>{tx.sender_iban || '-'}</td>
                                        <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(tx.amount)}</span></td>
                                        <td style={{ fontSize: 13 }}>{tx.description || '-'}</td>
                                        <td>
                                            <select
                                                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
                                                defaultValue=""
                                                onChange={e => e.target.value && match(tx.id, e.target.value)}
                                            >
                                                <option value="">Müşteri seç...</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </td>
                                    </tr>
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
                                    <th>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matched.map(tx => {
                                    const hasPayment = tx.payment !== undefined
                                    return (
                                        <tr key={tx.id}>
                                            <td style={{ fontSize: 13, color: '#6b7280' }}>{new Date(tx.date).toLocaleDateString('tr-TR')}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{getCustomerName(tx.matched_customer_id)}</td>
                                            <td style={{ fontSize: 12, color: '#6b7280' }}>{tx.sender_iban || '-'}</td>
                                            <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(tx.amount)}</span></td>
                                            <td style={{ fontSize: 13 }}>{tx.description || '-'}</td>
                                            <td>
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    style={{ background: '#d1fae5', color: 'var(--success)' }}
                                                    disabled={converting === tx.id}
                                                    onClick={() => convertToPayment(tx.id)}
                                                >
                                                    {converting === tx.id ? '...' : '💰 Ödemeye Dönüştür'}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Tüm işlemler özeti */}
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