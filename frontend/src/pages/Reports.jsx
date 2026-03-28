import { useEffect, useState } from 'react'
import axios from 'axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import API from '../api'
const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)

export default function Reports() {
    const [customers, setCustomers] = useState([])
    const [debts, setDebts] = useState([])
    const [payments, setPayments] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    useEffect(() => {
        axios.get(`${API}/customers/`).then(r => setCustomers(r.data))
        axios.get(`${API}/debts/`).then(r => setDebts(r.data))
        axios.get(`${API}/payments/`).then(r => setPayments(r.data))
    }, [])

    const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-'

    const filteredDebts = debts.filter(d => {
        const matchCustomer = selectedCustomer ? d.customer_id === parseInt(selectedCustomer) : true
        const matchFrom = dateFrom ? new Date(d.date) >= new Date(dateFrom) : true
        const matchTo = dateTo ? new Date(d.date) <= new Date(dateTo) : true
        return matchCustomer && matchFrom && matchTo
    })

    const filteredPayments = payments.filter(p => {
        const matchCustomer = selectedCustomer ? p.customer_id === parseInt(selectedCustomer) : true
        const matchFrom = dateFrom ? new Date(p.date) >= new Date(dateFrom) : true
        const matchTo = dateTo ? new Date(p.date) <= new Date(dateTo) : true
        return matchCustomer && matchFrom && matchTo
    })

    const totalDebt = filteredDebts.reduce((s, d) => s + d.amount, 0)
    const totalPayment = filteredPayments.reduce((s, p) => s + p.amount, 0)
    const remaining = totalDebt - totalPayment

    // Cari hesap hareketleri (borç + ödeme karışık, tarihe göre sıralı)
    const allTransactions = [
        ...filteredDebts.map(d => ({ ...d, type: 'debt' })),
        ...filteredPayments.map(p => ({ ...p, type: 'payment' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date))

    // PDF Export
    const exportPDF = () => {
        const doc = new jsPDF()
        const title = selectedCustomer
            ? `Cari Hesap Raporu — ${getCustomerName(parseInt(selectedCustomer))}`
            : 'Genel Cari Hesap Raporu'

        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Veresiye', 14, 20)

        doc.setFontSize(13)
        doc.setFont('helvetica', 'normal')
        doc.text(title, 14, 30)

        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 38)
        if (dateFrom || dateTo) {
            doc.text(`Dönem: ${dateFrom || '—'} / ${dateTo || '—'}`, 14, 44)
        }

        // Özet kutusu
        doc.setFontSize(11)
        doc.setTextColor(0)
        autoTable(doc, {
            startY: 52,
            head: [['Toplam Borç', 'Toplam Ödeme', 'Kalan Borç']],
            body: [[fmt(totalDebt), fmt(totalPayment), fmt(remaining)]],
            headStyles: { fillColor: [26, 86, 219] },
            styles: { fontSize: 11 }
        })

        // Hareketler tablosu
        let balance = 0
        const rows = allTransactions.map(tx => {
            if (tx.type === 'debt') balance += tx.amount
            else balance -= tx.amount
            return [
                new Date(tx.date).toLocaleDateString('tr-TR'),
                getCustomerName(tx.customer_id),
                tx.type === 'debt' ? 'Borç' : `Ödeme (${tx.method === 'banka' ? 'Banka' : 'Nakit'})`,
                tx.description || '-',
                tx.type === 'debt' ? fmt(tx.amount) : '',
                tx.type === 'payment' ? fmt(tx.amount) : '',
                fmt(balance)
            ]
        })

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Tarih', 'Müşteri', 'Tür', 'Açıklama', 'Borç', 'Ödeme', 'Bakiye']],
            body: rows,
            headStyles: { fillColor: [26, 86, 219] },
            styles: { fontSize: 9 },
            columnStyles: {
                4: { textColor: [224, 36, 36] },
                5: { textColor: [5, 122, 85] },
                6: { fontStyle: 'bold' }
            }
        })

        const filename = selectedCustomer
            ? `cari_${getCustomerName(parseInt(selectedCustomer))}_${new Date().toLocaleDateString('tr-TR')}.pdf`
            : `cari_rapor_${new Date().toLocaleDateString('tr-TR')}.pdf`
        doc.save(filename)
    }

    // Excel Export
    const exportExcel = () => {
        let balance = 0
        const rows = allTransactions.map(tx => {
            if (tx.type === 'debt') balance += tx.amount
            else balance -= tx.amount
            return {
                'Tarih': new Date(tx.date).toLocaleDateString('tr-TR'),
                'Müşteri': getCustomerName(tx.customer_id),
                'Tür': tx.type === 'debt' ? 'Borç' : `Ödeme (${tx.method === 'banka' ? 'Banka' : 'Nakit'})`,
                'Açıklama': tx.description || '',
                'Borç (₺)': tx.type === 'debt' ? tx.amount : '',
                'Ödeme (₺)': tx.type === 'payment' ? tx.amount : '',
                'Bakiye (₺)': balance
            }
        })

        // Özet satır ekle
        rows.unshift({
            'Tarih': 'ÖZET',
            'Müşteri': '',
            'Tür': '',
            'Açıklama': '',
            'Borç (₺)': totalDebt,
            'Ödeme (₺)': totalPayment,
            'Bakiye (₺)': remaining
        })

        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Cari Hesap')

        const filename = selectedCustomer
            ? `cari_${getCustomerName(parseInt(selectedCustomer))}_${new Date().toLocaleDateString('tr-TR')}.xlsx`
            : `cari_rapor_${new Date().toLocaleDateString('tr-TR')}.xlsx`
        XLSX.writeFile(wb, filename)
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Raporlar</h1>
                    <p className="page-subtitle">PDF veya Excel formatında rapor alın</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" data-testid="reports-excel" className="btn btn-outline" onClick={exportExcel}>📊 Excel İndir</button>
                    <button type="button" data-testid="reports-pdf" className="btn btn-primary" onClick={exportPDF}>📄 PDF İndir</button>
                </div>
            </div>

            {/* Filtreler */}
            <div className="card">
                <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>Filtreler</h3>
                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Müşteri</label>
                        <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                            <option value="">Tüm Müşteriler</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Başlangıç Tarihi</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Bitiş Tarihi</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Özet */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card">
                    <div className="stat-icon red">📋</div>
                    <div className="stat-label">Toplam Borç</div>
                    <div className="stat-value danger">{fmt(totalDebt)}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{filteredDebts.length} kayıt</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">💰</div>
                    <div className="stat-label">Toplam Tahsilat</div>
                    <div className="stat-value success">{fmt(totalPayment)}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{filteredPayments.length} kayıt</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow">⏳</div>
                    <div className="stat-label">Kalan Borç</div>
                    <div className={`stat-value ${remaining > 0 ? 'danger' : 'success'}`}>{fmt(remaining)}</div>
                </div>
            </div>

            {/* Önizleme tablosu */}
            <div className="card">
                <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
                    Önizleme — {allTransactions.length} hareket
                </h3>
                {allTransactions.length === 0 ? (
                    <div className="empty-state"><div className="icon">📄</div><p>Filtrelerle eşleşen kayıt yok</p></div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Müşteri</th>
                                    <th>Tür</th>
                                    <th>Açıklama</th>
                                    <th style={{ textAlign: 'right' }}>Borç</th>
                                    <th style={{ textAlign: 'right' }}>Ödeme</th>
                                    <th style={{ textAlign: 'right' }}>Bakiye</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    let bal = 0
                                    return allTransactions.map(tx => {
                                        if (tx.type === 'debt') bal += tx.amount
                                        else bal -= tx.amount
                                        return (
                                            <tr key={`${tx.type}-${tx.id}`}>
                                                <td style={{ fontSize: 13, color: '#6b7280' }}>{new Date(tx.date).toLocaleDateString('tr-TR')}</td>
                                                <td style={{ fontWeight: 600 }}>{getCustomerName(tx.customer_id)}</td>
                                                <td>
                                                    {tx.type === 'debt'
                                                        ? <span className="badge badge-danger">Borç</span>
                                                        : <span className="badge badge-success">{tx.method === 'banka' ? '🏦 Banka' : '💵 Nakit'}</span>
                                                    }
                                                </td>
                                                <td style={{ fontSize: 13 }}>{tx.description || '-'}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>
                                                    {tx.type === 'debt' ? fmt(tx.amount) : ''}
                                                </td>
                                                <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                                                    {tx.type === 'payment' ? fmt(tx.amount) : ''}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: bal > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                    {fmt(bal)}
                                                </td>
                                            </tr>
                                        )
                                    })
                                })()}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}