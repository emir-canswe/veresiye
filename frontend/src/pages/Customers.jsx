import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'https://veresiye-backend.onrender.com'
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function Customers() {
    const [customers, setCustomers] = useState([])
    const [debts, setDebts] = useState([])
    const [payments, setPayments] = useState([])
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDebtModal, setShowDebtModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '', iban: '', son_odeme_tarihi: '' })
    const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', notes: '', son_odeme_tarihi: '' })
    const [debtForm, setDebtForm] = useState({ amount: '', description: '', category: '' })
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'nakit', description: '' })
    const navigate = useNavigate()

    const load = () => {
        axios.get(`${API}/customers/`).then(r => setCustomers(r.data))
        axios.get(`${API}/debts/`).then(r => setDebts(r.data))
        axios.get(`${API}/payments/`).then(r => setPayments(r.data))
    }

    useEffect(() => { load() }, [])

    const getBalance = (customerId) => {
        const totalDebt = debts.filter(d => d.customer_id === customerId).reduce((s, d) => s + d.amount, 0)
        const totalPayment = payments.filter(p => p.customer_id === customerId).reduce((s, p) => s + p.amount, 0)
        return totalDebt - totalPayment
    }

    const isOverdue = (customer) => {
        if (!customer.son_odeme_tarihi) return getBalance(customer.id) > 0
        const balance = getBalance(customer.id)
        if (balance <= 0) return false
        const days = Math.floor((new Date() - new Date(customer.son_odeme_tarihi)) / (1000 * 60 * 60 * 24))
        return days > 30
    }

    const getDaysSincePayment = (customer) => {
        if (!customer.son_odeme_tarihi) return null
        return Math.floor((new Date() - new Date(customer.son_odeme_tarihi)) / (1000 * 60 * 60 * 24))
    }

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.ibans?.[0]?.iban && c.ibans[0].iban.includes(search))
    )

    const overdueCount = customers.filter(c => isOverdue(c)).length

    const openEditModal = (e, customer) => {
        e.stopPropagation()
        setSelectedCustomer(customer)
        setEditForm({
            name: customer.name || '',
            phone: customer.phone || '',
            address: customer.address || '',
            notes: customer.notes || '',
            son_odeme_tarihi: customer.son_odeme_tarihi
                ? new Date(customer.son_odeme_tarihi).toISOString().split('T')[0]
                : ''
        })
        setShowEditModal(true)
    }

    const save = async () => {
        try {
            const payload = {
                name: form.name, phone: form.phone, address: form.address, notes: form.notes,
                son_odeme_tarihi: form.son_odeme_tarihi || null,
                ibans: form.iban ? [{ iban: form.iban, label: 'Ana IBAN' }] : []
            }
            await axios.post(`${API}/customers/`, payload)
            setShowModal(false)
            setForm({ name: '', phone: '', address: '', notes: '', iban: '', son_odeme_tarihi: '' })
            load()
        } catch (e) {
            alert(e.response?.data?.detail || 'Kayıt sırasında hata oluştu!')
        }
    }

    const saveEdit = async () => {
        try {
            await axios.put(`${API}/customers/${selectedCustomer.id}`, {
                name: editForm.name,
                phone: editForm.phone,
                address: editForm.address,
                notes: editForm.notes,
                son_odeme_tarihi: editForm.son_odeme_tarihi || null,
                ibans: []
            })
            setShowEditModal(false)
            load()
        } catch (e) {
            alert(e.response?.data?.detail || 'Güncelleme sırasında hata oluştu!')
        }
    }

    const saveDebt = async () => {
        await axios.post(`${API}/debts/`, {
            customer_id: selectedCustomer.id,
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
            customer_id: selectedCustomer.id,
            amount: parseFloat(paymentForm.amount),
            method: paymentForm.method,
            description: paymentForm.description
        })
        setShowPaymentModal(false)
        setPaymentForm({ amount: '', method: 'nakit', description: '' })
        load()
    }

    const remove = async (e, id) => {
        e.stopPropagation()
        if (confirm('Müşteriyi ve tüm kayıtlarını silmek istediğinize emin misiniz?')) {
            await axios.delete(`${API}/customers/${id}`)
            load()
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Müşteriler</h1>
                    <p className="page-subtitle">
                        {customers.length} müşteri kayıtlı
                        {overdueCount > 0 && (
                            <span style={{ marginLeft: 12, color: 'var(--danger)', fontWeight: 600 }}>
                                ⚠️ {overdueCount} geciken ödeme
                            </span>
                        )}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Yeni Müşteri</button>
            </div>

            <div className="card">
                <div style={{ marginBottom: 16 }}>
                    <input
                        style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
                        placeholder="🔍 İsim, telefon veya IBAN ile ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">👥</div>
                        <p>{search ? 'Arama sonucu bulunamadı' : 'Henüz müşteri yok'}</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ad Soyad</th>
                                    <th>Telefon</th>
                                    <th>Son Ödeme</th>
                                    <th>Kayıt Tarihi</th>
                                    <th style={{ textAlign: 'right' }}>Kalan Borç</th>
                                    <th style={{ textAlign: 'center' }}>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(c => {
                                    const balance = getBalance(c.id)
                                    const overdue = isOverdue(c)
                                    const days = getDaysSincePayment(c)
                                    return (
                                        <tr key={c.id} style={{ background: overdue ? '#fff5f5' : 'white' }}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {overdue && <span title="Geciken ödeme">⚠️</span>}
                                                    <span
                                                        style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                                                        onClick={() => navigate(`/customers/${c.id}`)}
                                                    >
                                                        {c.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>{c.phone || '-'}</td>
                                            <td>
                                                {c.son_odeme_tarihi ? (
                                                    <div>
                                                        <div style={{ fontSize: 13 }}>{new Date(c.son_odeme_tarihi).toLocaleDateString('tr-TR')}</div>
                                                        {days !== null && balance > 0 && (
                                                            <div style={{ fontSize: 11, color: days > 30 ? 'var(--danger)' : '#6b7280' }}>
                                                                {days} gün önce
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Ödeme yok</span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 13, color: '#6b7280' }}>
                                                {new Date(c.created_at).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: balance > 0 ? 'var(--danger)' : balance < 0 ? 'var(--success)' : '#6b7280'
                                                }}>
                                                    {fmt(balance)}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    <button className="btn btn-danger btn-sm"
                                                        onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); setShowDebtModal(true) }}>
                                                        + Borç
                                                    </button>
                                                    <button className="btn btn-sm"
                                                        style={{ background: '#d1fae5', color: 'var(--success)' }}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); setShowPaymentModal(true) }}>
                                                        + Ödeme
                                                    </button>
                                                    <button className="btn btn-outline btn-sm"
                                                        onClick={() => navigate(`/customers/${c.id}`)}>
                                                        Detay
                                                    </button>
                                                    <button className="btn btn-sm"
                                                        style={{ background: '#eff6ff', color: 'var(--primary)' }}
                                                        onClick={(e) => openEditModal(e, c)}>
                                                        ✏️ Düzenle
                                                    </button>
                                                    <button className="btn btn-danger btn-sm"
                                                        onClick={(e) => remove(e, c.id)}>
                                                        Sil
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Yeni Müşteri Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Yeni Müşteri</div>
                        <div className="form-group">
                            <label>Ad Soyad *</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ahmet Yılmaz" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Telefon</label>
                                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="05XX XXX XX XX" />
                            </div>
                            <div className="form-group">
                                <label>IBAN</label>
                                <input value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} placeholder="TR00 0000 0000 0000 0000 00" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Son Ödeme Tarihi</label>
                                <input type="date" value={form.son_odeme_tarihi} onChange={e => setForm({ ...form, son_odeme_tarihi: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Kayıt Tarihi</label>
                                <input type="text" value={new Date().toLocaleDateString('tr-TR')} disabled
                                    style={{ background: '#f9fafb', color: '#6b7280' }} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Adres</label>
                            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Notlar</label>
                            <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={save} disabled={!form.name}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Müşteri Düzenle Modal */}
            {showEditModal && selectedCustomer && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Müşteri Düzenle — {selectedCustomer.name}</div>
                        <div className="form-group">
                            <label>Ad Soyad *</label>
                            <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Telefon</label>
                                <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="05XX XXX XX XX" />
                            </div>
                            <div className="form-group">
                                <label>Son Ödeme Tarihi</label>
                                <input type="date" value={editForm.son_odeme_tarihi} onChange={e => setEditForm({ ...editForm, son_odeme_tarihi: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Adres</label>
                            <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Notlar</label>
                            <textarea rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowEditModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={saveEdit} disabled={!editForm.name}>Güncelle</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Borç Ekle Modal */}
            {showDebtModal && selectedCustomer && (
                <div className="modal-overlay" onClick={() => setShowDebtModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Borç Ekle — {selectedCustomer.name}</div>
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

            {/* Ödeme Al Modal */}
            {showPaymentModal && selectedCustomer && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Ödeme Al — {selectedCustomer.name}</div>
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