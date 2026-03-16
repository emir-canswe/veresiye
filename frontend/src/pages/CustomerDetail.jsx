import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:8000'
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function CustomerDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [customer, setCustomer] = useState(null)
    const [debts, setDebts] = useState([])
    const [payments, setPayments] = useState([])
    const [showDebtModal, setShowDebtModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [debtForm, setDebtForm] = useState({ amount: '', description: '', category: '' })
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'nakit', description: '' })

    const load = () => {
        axios.get(`${API}/customers/${id}`).then(r => setCustomer(r.data))
        axios.get(`${API}/debts/customer/${id}`).then(r => setDebts(r.data))
        axios.get(`${API}/payments/customer/${id}`).then(r => setPayments(r.data))
    }

    useEffect(() => { load() }, [id])

    const totalDebt = debts.reduce((s, d) => s + d.amount, 0)
    const totalPayment = payments.reduce((s, p) => s + p.amount, 0)
    const remaining = totalDebt - totalPayment

    const allTransactions = [
        ...debts.map(d => ({ ...d, type: 'debt' })),
        ...payments.map(p => ({ ...p, type: 'payment' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    const saveDebt = async () => {
        await axios.post(`${API}/debts/`, {
            customer_id: parseInt(id),
            amount: parseFloat(debtForm.amount),
            description: debtForm.description,
            category: debtForm.category
        })
        setShowDebtModal(false)
        setDebtForm({ amount: '', description: '', category: '' })
        load()
    }

    const savePayment = async () => {
        await axios.post(`${API}/payments/`, {
            customer_id: parseInt(id),
            amount: parseFloat(paymentForm.amount),
            method: paymentForm.method,
            description: paymentForm.description
        })
        setShowPaymentModal(false)
        setPaymentForm({ amount: '', method: 'nakit', description: '' })
        load()
    }

    if (!customer) return <div style={{ padding: 40 }}>Yükleniyor...</div>

    return (
        <div>
            {/* Üst bar */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/customers')}>← Geri</button>
                    <div>
                        <h1 className="page-title">{customer.name}</h1>
                        <p className="page-subtitle">
                            {customer.phone && `📞 ${customer.phone}`}
                            {customer.ibans?.[0]?.iban && ` · 🏦 ${customer.ibans[0].iban}`}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-outline" onClick={() => setShowDebtModal(true)}>+ Borç Ekle</button>
                    <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>+ Ödeme Al</button>
                </div>
            </div>

            {/* Özet kartlar */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card">
                    <div className="stat-icon red">📋</div>
                    <div className="stat-label">Toplam Borç</div>
                    <div className="stat-value danger">{fmt(totalDebt)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">💰</div>
                    <div className="stat-label">Toplam Ödeme</div>
                    <div className="stat-value success">{fmt(totalPayment)}</div>
                </div>
                <div className="stat-card" style={{ border: remaining > 0 ? '2px solid #fca5a5' : '2px solid #6ee7b7' }}>
                    <div className={`stat-icon ${remaining > 0 ? 'yellow' : 'green'}`}>
                        {remaining > 0 ? '⏳' : '✅'}
                    </div>
                    <div className="stat-label">Kalan Borç</div>
                    <div className={`stat-value ${remaining > 0 ? 'danger' : 'success'}`}>{fmt(remaining)}</div>
                </div>
            </div>

            {/* Cari hesap tablosu */}
            <div className="card">
                <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>Cari Hesap Hareketleri</h3>
                {allTransactions.length === 0 ? (
                    <div className="empty-state"><div className="icon">📄</div><p>Henüz hareket yok</p></div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Tür</th>
                                    <th>Açıklama</th>
                                    <th>Kategori</th>
                                    <th style={{ textAlign: 'right' }}>Borç</th>
                                    <th style={{ textAlign: 'right' }}>Ödeme</th>
                                    <th style={{ textAlign: 'right' }}>Bakiye</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    let balance = 0
                                    const rows = [...allTransactions].reverse().map((tx, i) => {
                                        if (tx.type === 'debt') balance += tx.amount
                                        else balance -= tx.amount
                                        return { ...tx, balance, idx: i }
                                    }).reverse()
                                    return rows.map(tx => (
                                        <tr key={`${tx.type}-${tx.id}`}>
                                            <td style={{ color: '#6b7280', fontSize: 13 }}>
                                                {new Date(tx.date).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td>
                                                {tx.type === 'debt'
                                                    ? <span className="badge badge-danger">Borç</span>
                                                    : <span className="badge badge-success">
                                                        {tx.method === 'banka' ? '🏦 Banka' : '💵 Nakit'}
                                                    </span>
                                                }
                                            </td>
                                            <td>{tx.description || '-'}</td>
                                            <td>{tx.category ? <span className="badge badge-info">{tx.category}</span> : '-'}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>
                                                {tx.type === 'debt' ? fmt(tx.amount) : ''}
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                                                {tx.type === 'payment' ? fmt(tx.amount) : ''}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: tx.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                {fmt(tx.balance)}
                                            </td>
                                        </tr>
                                    ))
                                })()}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Borç Modal */}
            {showDebtModal && (
                <div className="modal-overlay" onClick={() => setShowDebtModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Borç Ekle — {customer.name}</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tutar (₺) *</label>
                                <input type="number" value={debtForm.amount} onChange={e => setDebtForm({ ...debtForm, amount: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label>Kategori</label>
                                <input value={debtForm.category} onChange={e => setDebtForm({ ...debtForm, category: e.target.value })} placeholder="Gıda, Elektronik..." />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Açıklama</label>
                            <textarea rows={3} value={debtForm.description} onChange={e => setDebtForm({ ...debtForm, description: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowDebtModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={saveDebt} disabled={!debtForm.amount}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ödeme Modal */}
            {showPaymentModal && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Ödeme Al — {customer.name}</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tutar (₺) *</label>
                                <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label>Ödeme Yöntemi *</label>
                                <select value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                                    <option value="nakit">💵 Nakit</option>
                                    <option value="banka">🏦 Banka Transferi</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Açıklama</label>
                            <textarea rows={3} value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowPaymentModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={savePayment} disabled={!paymentForm.amount}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}