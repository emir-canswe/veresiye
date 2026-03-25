import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API from '../api'
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function Debts() {
    const [debts, setDebts] = useState([])
    const [customers, setCustomers] = useState([])
    const [search, setSearch] = useState('')
    const [filterCustomer, setFilterCustomer] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ customer_id: '', amount: '', description: '', category: '' })
    const navigate = useNavigate()

    const load = () => {
        axios.get(`${API}/debts/`).then(r => setDebts(r.data))
        axios.get(`${API}/customers/`).then(r => setCustomers(r.data))
    }
    useEffect(() => { load() }, [])

    const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-'

    const filtered = debts.filter(d => {
        const name = getCustomerName(d.customer_id).toLowerCase()
        const matchSearch = name.includes(search.toLowerCase()) ||
            (d.description && d.description.toLowerCase().includes(search.toLowerCase())) ||
            (d.category && d.category.toLowerCase().includes(search.toLowerCase()))
        const matchCustomer = filterCustomer ? d.customer_id === parseInt(filterCustomer) : true
        return matchSearch && matchCustomer
    })

    const totalFiltered = filtered.reduce((s, d) => s + d.amount, 0)

    const save = async () => {
        await axios.post(`${API}/debts/`, { ...form, amount: parseFloat(form.amount) })
        setShowModal(false)
        setForm({ customer_id: '', amount: '', description: '', category: '' })
        load()
    }

    const remove = async (id) => {
        if (confirm('Borcu silmek istediğinize emin misiniz?')) {
            await axios.delete(`${API}/debts/${id}`)
            load()
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Borçlar</h1>
                    <p className="page-subtitle">{debts.length} kayıt · Toplam: {fmt(debts.reduce((s, d) => s + d.amount, 0))}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Yeni Borç</button>
            </div>

            <div className="card">
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <input
                        style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
                        placeholder="🔍 Müşteri, açıklama veya kategori ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select
                        style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, minWidth: 180 }}
                        value={filterCustomer}
                        onChange={e => setFilterCustomer(e.target.value)}
                    >
                        <option value="">Tüm Müşteriler</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {search || filterCustomer ? (
                    <div style={{ marginBottom: 12, fontSize: 13, color: '#6b7280' }}>
                        {filtered.length} sonuç · Toplam: <strong style={{ color: 'var(--danger)' }}>{fmt(totalFiltered)}</strong>
                    </div>
                ) : null}

                {filtered.length === 0 ? (
                    <div className="empty-state"><div className="icon">📋</div><p>Sonuç bulunamadı</p></div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Müşteri</th>
                                    <th>Tutar</th>
                                    <th>Kategori</th>
                                    <th>Açıklama</th>
                                    <th>Tarih</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(d => (
                                    <tr key={d.id}>
                                        <td>
                                            <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                                                onClick={() => navigate(`/customers/${d.customer_id}`)}>
                                                {getCustomerName(d.customer_id)}
                                            </span>
                                        </td>
                                        <td><span style={{ color: 'var(--danger)', fontWeight: 600 }}>{fmt(d.amount)}</span></td>
                                        <td>{d.category ? <span className="badge badge-info">{d.category}</span> : '-'}</td>
                                        <td>{d.description || '-'}</td>
                                        <td style={{ color: '#6b7280', fontSize: 13 }}>{new Date(d.date).toLocaleDateString('tr-TR')}</td>
                                        <td><button className="btn btn-danger btn-sm" onClick={() => remove(d.id)}>Sil</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Yeni Borç Ekle</div>
                        <div className="form-group">
                            <label>Müşteri *</label>
                            <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                                <option value="">Seçiniz...</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tutar (₺) *</label>
                                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label>Kategori</label>
                                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Gıda, Elektronik..." />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Açıklama</label>
                            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={save} disabled={!form.customer_id || !form.amount}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}