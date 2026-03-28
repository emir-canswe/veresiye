import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import API from '../api'

const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function CustomerDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [customer, setCustomer] = useState(null)
    const [debts, setDebts] = useState([])
    const [payments, setPayments] = useState([])
    const [showDebtModal, setShowDebtModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showIbanModal, setShowIbanModal] = useState(false)
    const [debtForm, setDebtForm] = useState({ amount: '', description: '', category: '' })
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'nakit', description: '' })
    const [ibanForm, setIbanForm] = useState({ iban: '', label: '' })
    const [sending, setSending] = useState(false)

    const load = useCallback(() => {
        axios.get(`${API}/customers/${id}`).then(r => setCustomer(r.data))
        axios.get(`${API}/debts/customer/${id}`).then(r => setDebts(r.data))
        axios.get(`${API}/payments/customer/${id}`).then(r => setPayments(r.data))
    }, [id])

    useEffect(() => { load() }, [load])

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

    const saveIban = async () => {
        try {
            await axios.put(`${API}/customers/${id}`, {
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                notes: customer.notes,
                son_odeme_tarihi: customer.son_odeme_tarihi,
                ibans: [
                    ...customer.ibans,
                    { iban: ibanForm.iban, label: ibanForm.label || 'IBAN' }
                ]
            })
            setShowIbanModal(false)
            setIbanForm({ iban: '', label: '' })
            load()
        } catch (e) {
            alert(e.response?.data?.detail || 'Hata oluştu!')
        }
    }

    const deleteIban = async (ibanId) => {
        if (confirm('Bu IBAN\'ı silmek istediğinize emin misiniz?')) {
            const newIbans = customer.ibans.filter(i => i.id !== ibanId)
            await axios.put(`${API}/customers/${id}`, {
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                notes: customer.notes,
                son_odeme_tarihi: customer.son_odeme_tarihi,
                ibans: newIbans
            })
            load()
        }
    }

    const sendNotification = async () => {
        setSending(true)
        try {
            await axios.post(`${API}/notifications/send-single/${id}`)
            alert('✅ Bildirim e-postası gönderildi!')
        } catch (e) {
            alert(e.response?.data?.detail || 'Hata oluştu!')
        }
        setSending(false)
    }

    const getCustomerEmail = () => {
        if (!customer?.notes) return null
        for (const line of customer.notes.split('\n')) {
            if (line.startsWith('email:')) return line.replace('email:', '').trim()
        }
        return null
    }

    if (!customer) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ color: '#6b7280' }}>Yükleniyor...</div>
        </div>
    )

    const email = getCustomerEmail()

    return (
        <div>
            {/* Üst bar */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                        onClick={() => navigate('/customers')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'white', border: '1.5px solid #e2e8f0',
                            borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                            fontSize: 14, fontWeight: 600, color: '#374151',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.18s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.color = '#1a56db' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151' }}
                    >
                        ← Müşteriler
                    </button>
                    <div>
                        <h1 className="page-title" data-testid="customer-detail-title">{customer.name}</h1>
                        <p className="page-subtitle">
                            {customer.phone && `📞 ${customer.phone}`}
                            {customer.phone && email && ' · '}
                            {email && `📧 ${email}`}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {remaining > 0 && (
                        <button className="btn btn-sm"
                            style={{ background: '#fef3c7', color: '#c27803', border: '1px solid #fcd34d' }}
                            onClick={sendNotification} disabled={sending}>
                            {sending ? '...' : '📧 Bildirim'}
                        </button>
                    )}
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
                <div className="stat-card" style={{
                    border: remaining > 0 ? '2px solid #fca5a5' : '2px solid #6ee7b7'
                }}>
                    <div className={`stat-icon ${remaining > 0 ? 'yellow' : 'green'}`}>
                        {remaining > 0 ? '⏳' : '✅'}
                    </div>
                    <div className="stat-label">Kalan Borç</div>
                    <div className={`stat-value ${remaining > 0 ? 'danger' : 'success'}`}>{fmt(remaining)}</div>
                </div>
            </div>

            {/* Müşteri bilgileri + IBAN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

                {/* Müşteri bilgileri */}
                <div className="card">
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#111827' }}>👤 Müşteri Bilgileri</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {customer.phone && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{ fontSize: 16 }}>📞</span>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Telefon</div>
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>{customer.phone}</div>
                                </div>
                            </div>
                        )}
                        {email && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{ fontSize: 16 }}>📧</span>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>E-posta</div>
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>{email}</div>
                                </div>
                            </div>
                        )}
                        {customer.address && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{ fontSize: 16 }}>📍</span>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Adres</div>
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>{customer.address}</div>
                                </div>
                            </div>
                        )}
                        {customer.son_odeme_tarihi && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{ fontSize: 16 }}>📅</span>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Son Ödeme</div>
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>{new Date(customer.son_odeme_tarihi).toLocaleDateString('tr-TR')}</div>
                                </div>
                            </div>
                        )}
                        {customer.notes && (
                            <div style={{ display: 'flex', gap: 10 }}>
                                <span style={{ fontSize: 16 }}>📝</span>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Notlar</div>
                                    <div style={{ fontSize: 14 }}>
                                        {customer.notes.split('\n').filter(l => !l.startsWith('email:')).join('\n')}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* IBAN listesi */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>🏦 IBAN Bilgileri</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowIbanModal(true)}>
                            + IBAN Ekle
                        </button>
                    </div>
                    {customer.ibans?.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: 14 }}>
                            Henüz IBAN eklenmemiş
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {customer.ibans.map((iban, i) => (
                                <div key={iban.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 14px', background: '#f8fafc',
                                    borderRadius: 10, border: '1px solid #e8f0fe'
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: '#dbeafe', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        fontSize: 16, flexShrink: 0
                                    }}>🏦</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>
                                            {iban.label || `IBAN ${i + 1}`}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>
                                            {iban.iban}
                                        </div>
                                    </div>
                                    <button onClick={() => deleteIban(iban.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', fontSize: 16 }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#e02424'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#fca5a5'}>
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
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
                                    const rows = [...allTransactions].reverse().map((tx) => {
                                        if (tx.type === 'debt') balance += tx.amount
                                        else balance -= tx.amount
                                        return { ...tx, balance }
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
                                                    </span>}
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

            {/* IBAN Ekle Modal */}
            {showIbanModal && (
                <div className="modal-overlay" onClick={() => setShowIbanModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">IBAN Ekle — {customer.name}</div>
                        <div className="form-group">
                            <label>IBAN *</label>
                            <input
                                value={ibanForm.iban}
                                onChange={e => setIbanForm({ ...ibanForm, iban: e.target.value })}
                                placeholder="TR00 0000 0000 0000 0000 00"
                                style={{ fontFamily: 'monospace' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Etiket</label>
                            <input
                                value={ibanForm.label}
                                onChange={e => setIbanForm({ ...ibanForm, label: e.target.value })}
                                placeholder="Ziraat Bankası, Garanti..."
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowIbanModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={saveIban} disabled={!ibanForm.iban}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

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