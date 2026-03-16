import { useEffect, useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function BankStatement() {
    const [transactions, setTransactions] = useState([])
    const [customers, setCustomers] = useState([])
    const [uploading, setUploading] = useState(false)

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

    const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-'

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 className="page-title" style={{ margin: 0 }}>Banka Ekstresi</h1>
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    {uploading ? 'Yükleniyor...' : '📂 Ekstre Yükle'}
                    <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={upload} style={{ display: 'none' }} />
                </label>
            </div>

            <div className="card" style={{ marginBottom: 16, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <p style={{ fontSize: 14, color: '#0369a1' }}>
                    💡 PDF, Excel (.xlsx) veya CSV formatında banka ekstrenizi yükleyin. Sistem otomatik olarak müşterilerle eşleştirmeye çalışacaktır.
                </p>
            </div>

            <div className="card">
                {transactions.length === 0 ? (
                    <div className="empty-state"><div className="icon">🏦</div><p>Henüz ekstre yüklenmedi</p></div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Gönderen</th>
                                <th>IBAN</th>
                                <th>Tutar</th>
                                <th>Açıklama</th>
                                <th>Eşleşme</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id}>
                                    <td>{new Date(tx.date).toLocaleDateString('tr-TR')}</td>
                                    <td>{tx.sender_name || '-'}</td>
                                    <td style={{ fontSize: 12, color: '#64748b' }}>{tx.sender_iban || '-'}</td>
                                    <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(tx.amount)}</span></td>
                                    <td>{tx.description || '-'}</td>
                                    <td>
                                        {tx.is_matched ? (
                                            <span className="badge badge-success">✅ {getCustomerName(tx.matched_customer_id)}</span>
                                        ) : (
                                            <select
                                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }}
                                                defaultValue=""
                                                onChange={e => e.target.value && match(tx.id, e.target.value)}
                                            >
                                                <option value="">Eşleştir...</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}