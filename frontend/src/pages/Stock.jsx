import { useEffect, useState } from 'react'
import axios from 'axios'
import API from '../api'

const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function Stock() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [stats, setStats] = useState(null)
    const [search, setSearch] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [activeTab, setActiveTab] = useState('urunler')
    const [movements, setMovements] = useState([])
    const [showProductModal, setShowProductModal] = useState(false)
    const [showMovementModal, setShowMovementModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [editProduct, setEditProduct] = useState(null)
    const [productForm, setProductForm] = useState({
        name: '', barcode: '', category_id: '', purchase_price: '',
        sale_price: '', stock_quantity: '', min_stock: '', unit: 'adet', description: ''
    })
    const [movementForm, setMovementForm] = useState({
        product_id: '', type: 'giris', quantity: '', unit_price: '', description: ''
    })
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })

    const load = () => {
        axios.get(`${API}/stock/products`).then(r => setProducts(r.data))
        axios.get(`${API}/stock/categories`).then(r => setCategories(r.data))
        axios.get(`${API}/stock/stats`).then(r => setStats(r.data))
        axios.get(`${API}/stock/movements`).then(r => setMovements(r.data))
    }

    useEffect(() => { load() }, [])

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.barcode && p.barcode.includes(search))
        const matchCat = filterCategory ? p.category_id === parseInt(filterCategory) : true
        return matchSearch && matchCat
    })

    const openAddProduct = () => {
        setEditProduct(null)
        setProductForm({ name: '', barcode: '', category_id: '', purchase_price: '', sale_price: '', stock_quantity: '', min_stock: '', unit: 'adet', description: '' })
        setShowProductModal(true)
    }

    const openEditProduct = (p) => {
        setEditProduct(p)
        setProductForm({
            name: p.name, barcode: p.barcode || '', category_id: p.category_id || '',
            purchase_price: p.purchase_price, sale_price: p.sale_price,
            stock_quantity: p.stock_quantity, min_stock: p.min_stock,
            unit: p.unit, description: p.description || ''
        })
        setShowProductModal(true)
    }

    const saveProduct = async () => {
        try {
            const payload = {
                ...productForm,
                category_id: productForm.category_id || null,
                purchase_price: parseFloat(productForm.purchase_price) || 0,
                sale_price: parseFloat(productForm.sale_price) || 0,
                stock_quantity: parseFloat(productForm.stock_quantity) || 0,
                min_stock: parseFloat(productForm.min_stock) || 0,
            }
            if (editProduct) {
                await axios.put(`${API}/stock/products/${editProduct.id}`, payload)
            } else {
                await axios.post(`${API}/stock/products`, payload)
            }
            setShowProductModal(false)
            load()
        } catch (e) {
            alert(e.response?.data?.detail || 'Hata oluştu!')
        }
    }

    const deleteProduct = async (id) => {
        if (confirm('Ürünü silmek istediğinize emin misiniz?')) {
            await axios.delete(`${API}/stock/products/${id}`)
            load()
        }
    }

    const saveMovement = async () => {
        try {
            await axios.post(`${API}/stock/movements`, {
                ...movementForm,
                product_id: parseInt(movementForm.product_id),
                quantity: parseFloat(movementForm.quantity),
                unit_price: parseFloat(movementForm.unit_price) || 0,
            })
            setShowMovementModal(false)
            setMovementForm({ product_id: '', type: 'giris', quantity: '', unit_price: '', description: '' })
            load()
        } catch (e) {
            alert(e.response?.data?.detail || 'Hata oluştu!')
        }
    }

    const saveCategory = async () => {
        try {
            await axios.post(`${API}/stock/categories`, categoryForm)
            setShowCategoryModal(false)
            setCategoryForm({ name: '', description: '' })
            load()
        } catch (e) {
            alert(e.response?.data?.detail || 'Hata oluştu!')
        }
    }

    const movementTypeLabel = (type) => {
        if (type === 'giris') return <span className="badge badge-success">📦 Giriş</span>
        if (type === 'cikis') return <span className="badge badge-danger">📤 Çıkış</span>
        return <span className="badge badge-info">↩️ İade</span>
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Stok Yönetimi</h1>
                    <p className="page-subtitle">Ürün ve stok hareketlerinizi takip edin</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-outline" onClick={() => setShowCategoryModal(true)}>+ Kategori</button>
                    <button className="btn btn-outline" onClick={() => setShowMovementModal(true)}>📦 Stok Hareketi</button>
                    <button className="btn btn-primary" onClick={openAddProduct}>+ Yeni Ürün</button>
                </div>
            </div>

            {/* İstatistikler */}
            {stats && (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                    <div className="stat-card">
                        <div className="stat-icon blue">📦</div>
                        <div className="stat-label">Toplam Ürün</div>
                        <div className="stat-value primary">{stats.toplam_urun}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon red">⚠️</div>
                        <div className="stat-label">Düşük Stok</div>
                        <div className="stat-value danger">{stats.dusuk_stok}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green">💰</div>
                        <div className="stat-label">Stok Değeri</div>
                        <div className="stat-value success">{fmt(stats.toplam_stok_degeri)}</div>
                    </div>
                </div>
            )}

            {/* Düşük stok uyarısı */}
            {stats?.dusuk_stok > 0 && (
                <div style={{
                    background: '#fff5f5', border: '1px solid #fca5a5',
                    borderRadius: 12, padding: '14px 20px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 10
                }}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--danger)' }}>
                            {stats.dusuk_stok} ürünün stoğu kritik seviyede!
                        </div>
                        <div style={{ fontSize: 13, color: '#9b1c1c' }}>
                            Stok girişi yapmanız önerilir.
                        </div>
                    </div>
                </div>
            )}

            {/* Tab */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 6, borderRadius: 12, border: '1px solid var(--border)', width: 'fit-content' }}>
                {[{ id: 'urunler', label: '📦 Ürünler' }, { id: 'hareketler', label: '🔄 Hareketler' }].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: activeTab === t.id ? 'var(--primary)' : 'transparent',
                        color: activeTab === t.id ? 'white' : '#6b7280',
                        fontWeight: activeTab === t.id ? 700 : 500, fontSize: 14
                    }}>{t.label}</button>
                ))}
            </div>

            {/* Ürünler */}
            {activeTab === 'urunler' && (
                <div className="card">
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <input
                            style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
                            placeholder="🔍 Ürün adı veya barkod ile ara..."
                            value={search} onChange={e => setSearch(e.target.value)}
                        />
                        <select
                            style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, minWidth: 160 }}
                            value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                        >
                            <option value="">Tüm Kategoriler</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="empty-state"><div className="icon">📦</div><p>Ürün bulunamadı</p></div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ürün Adı</th>
                                        <th>Kategori</th>
                                        <th>Barkod</th>
                                        <th style={{ textAlign: 'right' }}>Alış</th>
                                        <th style={{ textAlign: 'right' }}>Satış</th>
                                        <th style={{ textAlign: 'right' }}>Stok</th>
                                        <th style={{ textAlign: 'center' }}>Durum</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(p => (
                                        <tr key={p.id} style={{ background: p.is_low_stock ? '#fff5f5' : 'white' }}>
                                            <td style={{ fontWeight: 600 }}>
                                                {p.is_low_stock && <span style={{ marginRight: 6 }}>⚠️</span>}
                                                {p.name}
                                            </td>
                                            <td>{p.category_name ? <span className="badge badge-info">{p.category_name}</span> : '-'}</td>
                                            <td style={{ fontSize: 12, color: '#6b7280' }}>{p.barcode || '-'}</td>
                                            <td style={{ textAlign: 'right' }}>{fmt(p.purchase_price)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{fmt(p.sale_price)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: p.is_low_stock ? 'var(--danger)' : '#111827' }}>
                                                {p.stock_quantity} {p.unit}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {p.is_low_stock
                                                    ? <span className="badge badge-danger">Kritik</span>
                                                    : <span className="badge badge-success">Normal</span>}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-outline btn-sm" onClick={() => openEditProduct(p)}>✏️</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>Sil</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Hareketler */}
            {activeTab === 'hareketler' && (
                <div className="card">
                    {movements.length === 0 ? (
                        <div className="empty-state"><div className="icon">🔄</div><p>Henüz hareket yok</p></div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Ürün</th>
                                        <th>Tür</th>
                                        <th style={{ textAlign: 'right' }}>Miktar</th>
                                        <th style={{ textAlign: 'right' }}>Birim Fiyat</th>
                                        <th style={{ textAlign: 'right' }}>Toplam</th>
                                        <th>Açıklama</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.map(m => (
                                        <tr key={m.id}>
                                            <td style={{ fontSize: 13, color: '#6b7280' }}>{new Date(m.date).toLocaleDateString('tr-TR')}</td>
                                            <td style={{ fontWeight: 600 }}>{m.product_name}</td>
                                            <td>{movementTypeLabel(m.type)}</td>
                                            <td style={{ textAlign: 'right' }}>{m.quantity}</td>
                                            <td style={{ textAlign: 'right' }}>{fmt(m.unit_price)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(m.total)}</td>
                                            <td style={{ fontSize: 13 }}>{m.description || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Ürün Modal */}
            {showProductModal && (
                <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">{editProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}</div>
                        <div className="form-group">
                            <label>Ürün Adı *</label>
                            <input value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} placeholder="Ürün adı" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Barkod</label>
                                <input value={productForm.barcode} onChange={e => setProductForm({ ...productForm, barcode: e.target.value })} placeholder="Barkod" />
                            </div>
                            <div className="form-group">
                                <label>Kategori</label>
                                <select value={productForm.category_id} onChange={e => setProductForm({ ...productForm, category_id: e.target.value })}>
                                    <option value="">Seçiniz</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Alış Fiyatı (₺)</label>
                                <input type="number" value={productForm.purchase_price} onChange={e => setProductForm({ ...productForm, purchase_price: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label>Satış Fiyatı (₺)</label>
                                <input type="number" value={productForm.sale_price} onChange={e => setProductForm({ ...productForm, sale_price: e.target.value })} placeholder="0.00" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Başlangıç Stok</label>
                                <input type="number" value={productForm.stock_quantity} onChange={e => setProductForm({ ...productForm, stock_quantity: e.target.value })} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label>Min. Stok Uyarısı</label>
                                <input type="number" value={productForm.min_stock} onChange={e => setProductForm({ ...productForm, min_stock: e.target.value })} placeholder="0" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Birim</label>
                                <select value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })}>
                                    <option value="adet">Adet</option>
                                    <option value="kg">Kg</option>
                                    <option value="lt">Litre</option>
                                    <option value="m">Metre</option>
                                    <option value="paket">Paket</option>
                                    <option value="kutu">Kutu</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Açıklama</label>
                            <textarea rows={2} value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowProductModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={saveProduct} disabled={!productForm.name}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stok Hareketi Modal */}
            {showMovementModal && (
                <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Stok Hareketi</div>
                        <div className="form-group">
                            <label>Ürün *</label>
                            <select value={movementForm.product_id} onChange={e => setMovementForm({ ...movementForm, product_id: e.target.value })}>
                                <option value="">Seçiniz...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock_quantity} {p.unit})</option>)}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Hareket Türü *</label>
                                <select value={movementForm.type} onChange={e => setMovementForm({ ...movementForm, type: e.target.value })}>
                                    <option value="giris">📦 Stok Girişi</option>
                                    <option value="cikis">📤 Stok Çıkışı</option>
                                    <option value="iade">↩️ İade</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Miktar *</label>
                                <input type="number" value={movementForm.quantity} onChange={e => setMovementForm({ ...movementForm, quantity: e.target.value })} placeholder="0" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Birim Fiyat (₺)</label>
                            <input type="number" value={movementForm.unit_price} onChange={e => setMovementForm({ ...movementForm, unit_price: e.target.value })} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                            <label>Açıklama</label>
                            <textarea rows={2} value={movementForm.description} onChange={e => setMovementForm({ ...movementForm, description: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowMovementModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={saveMovement} disabled={!movementForm.product_id || !movementForm.quantity}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kategori Modal */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Yeni Kategori</div>
                        <div className="form-group">
                            <label>Kategori Adı *</label>
                            <input value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Kategori adı" />
                        </div>
                        <div className="form-group">
                            <label>Açıklama</label>
                            <textarea rows={2} value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowCategoryModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={saveCategory} disabled={!categoryForm.name}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}