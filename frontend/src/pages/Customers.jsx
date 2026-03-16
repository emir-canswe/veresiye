import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:8000'

export default function Customers() {
    const [customers, setCustomers] = useState([])
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '', iban: '' })
    const navigate = useNavigate()

    const load = () => axios.get(`${API}/customers/`).then(r => setCustomers(r.data))
    useEffect(() => { load() }, [])

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.ibans?.[0]?.iban && c.ibans[0].iban.includes(search))
    )

    const save = async () => {
        const payload = {
            name: form.name, phone: form.phone, address: form.address, notes: form.notes,
            ibans: form.iban ? [{ iban: form.iban, label: 'Ana IBAN' }] : []
        }
        await axios.post(`${API}/customers/`, payload)
        setShowModal(false)
        setForm({ name: '', phone: '', address: '', notes: '', iban: '' })
        load()
    }

    const remove = async (e, id) => {
        e.stopPropagation()
        if (confirm('Müşteriyi silmek istediğinize emin misiniz?')) {
            await axios.delete(`${API}/customers/${id}`)
            load()
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Müşteriler</h1>
                    <p className="page-subtitle">{customers.length} müşteri kayıtlı</p>
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
                                    <th>IBAN</th>
                                    <th>Kayıt Tarihi</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(c => (
                                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/customers/${c.id}`)}>
                                        <td><span style={{ color: 'var(--primary)', fontWeight: 600 }}>{c.name}</span></td>
                                        <td>{c.phone || '-'}</td>
                                        <td style={{ fontSize: 12, color: '#6b7280' }}>{c.ibans?.[0]?.iban || '-'}</td>
                                        <td>{new Date(c.created_at).toLocaleDateString('tr-TR')}</td>
                                        <td><button className="btn btn-danger btn-sm" onClick={(e) => remove(e, c.id)}>Sil</button></td>
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
        </div>
    )
}