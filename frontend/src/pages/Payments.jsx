import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API from '../api'
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function Payments() {
    const [payments, setPayments] = useState([])
    const [customers, setCustomers] = useState([])
    const [search, setSearch] = useState('')
    const [filterMethod, setFilterMethod] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ customer_id: '', amount: '', method: 'nakit', description: '' })
    const navigate = useNavigate()

    const load = () => {
        axios.get(`${API}/payments/`).then(r => setPayments(r.data))
        axios.get(`${API}/customers/`).then(r => setCustomers(r.data))
    }
    useEffect(() => { load() }, [])

    const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-'

    const filtered = payments.filter(p => {
        const name = getCustomerName(p.customer_id).toLowerCase()
        const matchSearch = name.includes(search.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
        const matchMethod = filterMethod ? p.method === filterMethod : true
        return matchSearch && matchMethod
    })

    const save = async () => {
        await axios.post(`${API}/payments/`, { ...form, amount: parseFloat(form.amount) })
        setShowModal(false)
        setForm({ customer_id: '', amount: '', method: 'nakit', description: '' })
        load()
    }

    const remove = async (id) => {
        if (confirm('Ödemeyi silmek istediğinize emin misiniz?')) {
            await axios.delete(`${API}/payments/${id}`)
            load()
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Ödemeler</h1>
                    <p className="page-subtitle">{payments.length} kayıt · Toplam: {fmt(payments.reduce((s, p) => s + p.amount, 0))}</p>
                </div>
                <button type="button" data-testid="payments-add" className="btn btn-primary" onClick={() => setShowModal(true)}>+ Yeni Ödeme</button>
            </div>

            <div className="card">
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <input
                        style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
                        placeholder="🔍 Müşteri veya açıklama ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select
                        style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, minWidth: 160 }}
                        value={filterMethod}
                        onChange={e => setFilterMethod(e.target.value)}
                    >
                        <option value="">Tüm Yöntemler</option>
                        <option value="nakit">💵 Nakit</option>
                        <option value="banka">🏦 Banka</option>
                    </select>
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-state"><div className="icon">💰</div><p>Sonuç bulunamadı</p></div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Müşteri</th>
                                    <th>Tutar</th>
                                    <th>Yöntem</th>
                                    <th>Açıklama</th>
                                    <th>Tarih</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                                                onClick={() => navigate(`/customers/${p.customer_id}`)}>
                                                {getCustomerName(p.customer_id)}
                                            </span>
                                        </td>
                                        <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(p.amount)}</span></td>
                                        <td>
                                            <span className={`badge ${p.method === 'banka' ? 'badge-info' : 'badge-success'}`}>
                                                {p.method === 'banka' ? '🏦 Banka' : '💵 Nakit'}
                                            </span>
                                        </td>
                                        <td>{p.description || '-'}</td>
                                        <td style={{ color: '#6b7280', fontSize: 13 }}>{new Date(p.date).toLocaleDateString('tr-TR')}</td>
                                        <td><button className="btn btn-danger btn-sm" onClick={() => remove(p.id)}>Sil</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" data-testid="payment-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Yeni Ödeme Ekle</div>
                        <div className="form-group">
                            <label>Müşteri *</label>
                            <select data-testid="payment-customer" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                                <option value="">Seçiniz...</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tutar (₺) *</label>
                                <input data-testid="payment-amount" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label>Ödeme Yöntemi *</label>
                                <select data-testid="payment-method" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                                    <option value="nakit">💵 Nakit</option>
                                    <option value="banka">🏦 Banka Transferi</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Açıklama</label>
                            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn" onClick={() => setShowModal(false)}>İptal</button>
                            <button type="button" data-testid="payment-save" className="btn btn-primary" onClick={save} disabled={!form.customer_id || !form.amount}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}