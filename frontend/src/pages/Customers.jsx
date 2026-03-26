import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API from '../api'

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
    const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '', iban: '', son_odeme_tarihi: '', email: '' })
    const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', notes: '', son_odeme_tarihi: '', email: '' })
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

    const getCustomerEmail = (customer) => {
        if (!customer?.notes) return null
        for (const line of customer.notes.split('\n')) {
            if (line.startsWith('email:')) return line.replace('email:', '').trim()
        }
        return null
    }

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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
            notes: customer.notes ? customer.notes.split('\n').filter(l => !l.startsWith('email:')).join('\n') : '',
            son_odeme_tarihi: customer.son_odeme_tarihi ? new Date(customer.son_odeme_tarihi).toISOString().split('T')[0] : '',
            email: getCustomerEmail(customer) || ''
        })
        setShowEditModal(true)
    }

    const save = async () => {
        try {
            const notesWithEmail = form.email
                ? `email:${form.email}${form.notes ? '\n' + form.notes : ''}`
                : form.notes
            const payload = {
                name: form.name, phone: form.phone, address: form.address,
                notes: notesWithEmail, son_odeme_tarihi: form.son_odeme_tarihi || null,
                ibans: form.iban ? [{ iban: form.iban, label: 'Ana IBAN' }] : []
            }
            await axios.post(`${API}/customers/`, payload)
            setShowModal(false)
            setForm({ name: '', phone: '', address: '', notes: '', iban: '', son_odeme_tarihi: '', email: '' })
            load()
        } catch (e) {
            alert(e.response?.data?.detail || 'Kayıt sırasında hata oluştu!')
        }
    }

    const saveEdit = async () => {
        try {
            const notesWithEmail = editForm.email
                ? `email:${editForm.email}${editForm.notes ? '\n' + editForm.notes : ''}`
                : editForm.notes
            await axios.put(`${API}/customers/${selectedCustomer.id}`, {
                name: editForm.name, phone: editForm.phone, address: editForm.address,
                notes: notesWithEmail, son_odeme_tarihi: editForm.son_odeme_tarihi || null, ibans: []
            })
            setShowEditModal(false)
            load()
        } catch (e) {
            alert(e.response?.data?.detail || 'Güncelleme sırasında hata oluştu!')
        }
    }

    const saveDebt = async () => {
        await axios.post(`${API}/debts/`, {
            customer_id: selectedCustomer.id, amount: parseFloat(debtForm.amount),
            description: debtForm.description, category: debtForm.category
        })
        setShowDebtModal(false)
        setDebtForm({ amount: '', description: '', category: '' })
        load()
    }

    const savePayment = async () => {
        await axios.post(`${API}/payments/`, {
            customer_id: selectedCustomer.id, amount: parseFloat(paymentForm.amount),
            method: paymentForm.method, description: paymentForm.description
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

    const avatarColors = ['#1a56db', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
    const getAvatarColor = (name) => avatarColors[name.charCodeAt(0) % avatarColors.length]

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

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Arama */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 16 }}>🔍</span>
                        <input
                            style={{
                                width: '100%', padding: '10px 14px 10px 40px',
                                border: '1.5px solid #e2e8f0', borderRadius: 10,
                                fontSize: 14, outline: 'none', transition: 'border 0.18s'
                            }}
                            placeholder="İsim, telefon veya IBAN ile ara..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onFocus={e => e.target.style.borderColor = '#1a56db'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">👥</div>
                        <p>{search ? 'Arama sonucu bulunamadı' : 'Henüz müşteri yok'}</p>
                    </div>
                ) : (
                    <div>
                        {/* Tablo başlığı */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2.5fr 1.2fr 1.8fr 1.2fr 1.2fr 1.5fr',
                            padding: '10px 20px',
                            background: '#f8fafc',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: 11, fontWeight: 700, color: '#94a3b8',
                            textTransform: 'uppercase', letterSpacing: '0.06em'
                        }}>
                            <div>Müşteri</div>
                            <div>Telefon</div>
                            <div>E-posta</div>
                            <div>Son Ödeme</div>
                            <div style={{ textAlign: 'right' }}>Kalan Borç</div>
                            <div style={{ textAlign: 'center' }}>İşlemler</div>
                        </div>

                        {/* Satırlar */}
                        {filtered.map((c, idx) => {
                            const balance = getBalance(c.id)
                            const overdue = isOverdue(c)
                            const days = getDaysSincePayment(c)
                            const email = getCustomerEmail(c)
                            return (
                                <div key={c.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2.5fr 1.2fr 1.8fr 1.2fr 1.2fr 1.5fr',
                                        padding: '14px 20px',
                                        borderBottom: idx < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                                        background: overdue ? '#fff8f8' : 'white',
                                        transition: 'background 0.15s',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = overdue ? '#ffeaea' : '#f8fbff'}
                                    onMouseLeave={e => e.currentTarget.style.background = overdue ? '#fff8f8' : 'white'}
                                >
                                    {/* Müşteri */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                                        onClick={() => navigate(`/customers/${c.id}`)}>
                                        <div style={{
                                            width: 38, height: 38, borderRadius: '50%',
                                            background: getAvatarColor(c.name),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0
                                        }}>
                                            {getInitials(c.name)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {overdue && <span title="Geciken ödeme" style={{ fontSize: 13 }}>⚠️</span>}
                                                <span style={{ color: 'var(--primary)' }}>{c.name}</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                                {new Date(c.created_at).toLocaleDateString('tr-TR')} tarihinde eklendi
                                            </div>
                                        </div>
                                    </div>

                                    {/* Telefon */}
                                    <div style={{ fontSize: 13, color: '#374151' }}>{c.phone || <span style={{ color: '#d1d5db' }}>—</span>}</div>

                                    {/* E-posta */}
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                        {email ? (
                                            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>
                                                {email}
                                            </span>
                                        ) : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </div>

                                    {/* Son Ödeme */}
                                    <div>
                                        {c.son_odeme_tarihi ? (
                                            <div>
                                                <div style={{ fontSize: 13, color: '#374151' }}>{new Date(c.son_odeme_tarihi).toLocaleDateString('tr-TR')}</div>
                                                {days !== null && balance > 0 && (
                                                    <div style={{ fontSize: 11, color: days > 30 ? 'var(--danger)' : '#9ca3af', marginTop: 2 }}>
                                                        {days} gün önce
                                                    </div>
                                                )}
                                            </div>
                                        ) : <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>}
                                    </div>

                                    {/* Kalan Borç */}
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            fontWeight: 700, fontSize: 15,
                                            color: balance > 0 ? 'var(--danger)' : balance < 0 ? 'var(--success)' : '#d1d5db'
                                        }}>
                                            {fmt(balance)}
                                        </span>
                                    </div>

                                    {/* İşlemler */}
                                    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                                        <button title="Borç Ekle" onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); setShowDebtModal(true) }}
                                            style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#fde8e8', color: '#e02424', transition: 'all 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fbd5d5'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#fde8e8'}>
                                            +Borç
                                        </button>
                                        <button title="Ödeme Al" onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); setShowPaymentModal(true) }}
                                            style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#def7ec', color: '#057a55', transition: 'all 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#bcf0da'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#def7ec'}>
                                            +Ödeme
                                        </button>
                                        <button title="Düzenle" onClick={(e) => openEditModal(e, c)}
                                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13, background: 'white', color: '#6b7280', transition: 'all 0.15s' }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a56db'; e.currentTarget.style.color = '#1a56db' }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#6b7280' }}>
                                            ✏️
                                        </button>
                                        <button title="Sil" onClick={(e) => remove(e, c.id)}
                                            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #fca5a5', cursor: 'pointer', fontSize: 13, background: 'white', color: '#e02424', transition: 'all 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fde8e8'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
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
                                <label>E-posta</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="musteri@gmail.com" />
                            </div>
                            <div className="form-group">
                                <label>Son Ödeme Tarihi</label>
                                <input type="date" value={form.son_odeme_tarihi} onChange={e => setForm({ ...form, son_odeme_tarihi: e.target.value })} />
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
                                <label>E-posta</label>
                                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="musteri@gmail.com" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Son Ödeme Tarihi</label>
                                <input type="date" value={editForm.son_odeme_tarihi} onChange={e => setEditForm({ ...editForm, son_odeme_tarihi: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Adres</label>
                                <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                            </div>
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