import { useEffect, useState } from 'react'
import axios from 'axios'
import API from '../api'

const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function Finance() {
    const [transactions, setTransactions] = useState([])
    const [summary, setSummary] = useState(null)
    const [search, setSearch] = useState('')
    const [filterType, setFilterType] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({
        type: 'gelir', amount: '', category: '',
        description: '', payment_method: 'nakit', date: ''
    })

    const load = () => {
        axios.get(`${API}/finance/`).then(r => setTransactions(r.data))
        axios.get(`${API}/finance/summary`).then(r => setSummary(r.data))
    }

    useEffect(() => { load() }, [])

    const filtered = transactions.filter(t => {
        const matchSearch = (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
            (t.category && t.category.toLowerCase().includes(search.toLowerCase()))
        const matchType = filterType ? t.type === filterType : true
        return matchSearch && matchType
    })

    const save = async () => {
        try {
            await axios.post(`${API}/finance/`, {
                ...form,
                amount: parseFloat(form.amount),
                date: form.date || undefined
            })
            setShowModal(false)
            setForm({ type: 'gelir', amount: '', category: '', description: '', payment_method: 'nakit', date: '' })
            load()
        } catch (e) {
            alert(e.response?.data?.detail || 'Hata oluştu!')
        }
    }

    const remove = async (id) => {
        if (confirm('İşlemi silmek istediğinize emin misiniz?')) {
            await axios.delete(`${API}/finance/${id}`)
            load()
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gelir / Gider</h1>
                    <p className="page-subtitle">İşletme gelir ve giderlerinizi takip edin</p>
                </div>
                <button type="button" data-testid="finance-add" className="btn btn-primary" onClick={() => setShowModal(true)}>+ Yeni İşlem</button>
            </div>

            {/* Özet kartlar */}
            {summary && (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                    <div className="stat-card">
                        <div className="stat-icon green">📈</div>
                        <div className="stat-label">Toplam Gelir</div>
                        <div className="stat-value success">{fmt(summary.toplam_gelir)}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon red">📉</div>
                        <div className="stat-label">Toplam Gider</div>
                        <div className="stat-value danger">{fmt(summary.toplam_gider)}</div>
                    </div>
                    <div className="stat-card" style={{
                        border: summary.net_kar >= 0 ? '2px solid #6ee7b7' : '2px solid #fca5a5'
                    }}>
                        <div className={`stat-icon ${summary.net_kar >= 0 ? 'green' : 'red'}`}>
                            {summary.net_kar >= 0 ? '✅' : '❌'}
                        </div>
                        <div className="stat-label">Net Kar</div>
                        <div className={`stat-value ${summary.net_kar >= 0 ? 'success' : 'danger'}`}>
                            {fmt(summary.net_kar)}
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <input
                        style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
                        placeholder="🔍 Açıklama veya kategori ara..."
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                    <select
                        style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, minWidth: 160 }}
                        value={filterType} onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="">Tümü</option>
                        <option value="gelir">📈 Gelir</option>
                        <option value="gider">📉 Gider</option>
                    </select>
                </div>

                {filtered.length === 0 ? (
                    <div className="empty-state"><div className="icon">💼</div><p>İşlem bulunamadı</p></div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Tür</th>
                                    <th>Kategori</th>
                                    <th>Açıklama</th>
                                    <th>Ödeme Yöntemi</th>
                                    <th style={{ textAlign: 'right' }}>Tutar</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(t => (
                                    <tr key={t.id}>
                                        <td style={{ fontSize: 13, color: '#6b7280' }}>
                                            {new Date(t.date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td>
                                            {t.type === 'gelir'
                                                ? <span className="badge badge-success">📈 Gelir</span>
                                                : <span className="badge badge-danger">📉 Gider</span>}
                                        </td>
                                        <td>{t.category ? <span className="badge badge-info">{t.category}</span> : '-'}</td>
                                        <td style={{ fontSize: 13 }}>{t.description || '-'}</td>
                                        <td>
                                            <span className={`badge ${t.payment_method === 'banka' ? 'badge-info' : 'badge-gray'}`}>
                                                {t.payment_method === 'banka' ? '🏦 Banka' : '💵 Nakit'}
                                            </span>
                                        </td>
                                        <td style={{
                                            textAlign: 'right', fontWeight: 700,
                                            color: t.type === 'gelir' ? 'var(--success)' : 'var(--danger)'
                                        }}>
                                            {t.type === 'gelir' ? '+' : '-'}{fmt(t.amount)}
                                        </td>
                                        <td>
                                            <button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}>Sil</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" data-testid="finance-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Yeni Gelir / Gider</div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>İşlem Türü *</label>
                                <select data-testid="finance-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    <option value="gelir">📈 Gelir</option>
                                    <option value="gider">📉 Gider</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Tutar (₺) *</label>
                                <input data-testid="finance-amount" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Kategori</label>
                                <input data-testid="finance-category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Kira, Fatura, Satış..." />
                            </div>
                            <div className="form-group">
                                <label>Ödeme Yöntemi</label>
                                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                                    <option value="nakit">💵 Nakit</option>
                                    <option value="banka">🏦 Banka</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Tarih</label>
                            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Açıklama</label>
                            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn" onClick={() => setShowModal(false)}>İptal</button>
                            <button type="button" data-testid="finance-save" className="btn btn-primary" onClick={save} disabled={!form.amount}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}