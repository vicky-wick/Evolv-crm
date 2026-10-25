import { useEffect, useState } from 'react'
import { FileText, Receipt, Download, Eye, Plus, X, Copy, Trash2 } from 'lucide-react'
import { useStore, uid, today, money, docTotals } from '../store.jsx'
import { Page, Modal, Tabs, DocBadge, Empty, fmtDate, useToast } from '../components/ui.jsx'
import { generatePDF } from '../pdf.js'

const STATUSES = { Quotation: ['Draft', 'Sent', 'Accepted', 'Rejected'], Invoice: ['Draft', 'Sent', 'Paid', 'Overdue'] }
const addDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

function nextNumber(docs, type) {
  const prefix = (type === 'Invoice' ? 'INV' : 'QT') + '-' + new Date().getFullYear() + '-'
  const max = docs.filter((d) => d.number.startsWith(prefix)).reduce((m, d) => Math.max(m, parseInt(d.number.slice(prefix.length)) || 0), 0)
  return prefix + String(max + 1).padStart(3, '0')
}

export default function Documents({ docIntent, clearDocIntent }) {
  const { docs, leads, settings, saveDoc, deleteDoc } = useStore()
  const toast = useToast()
  const [tab, setTab] = useState('All')
  const [edit, setEdit] = useState(null)

  const blank = (type, leadId = '') => {
    const lead = leads.find((l) => l.id === leadId)
    return {
      id: uid(), type, number: nextNumber(docs, type), leadId, clientName: '',
      date: today(), dueDate: addDays(type === 'Invoice' ? 15 : 30), status: 'Draft',
      subject: type === 'Quotation' ? 'Website design & development' : '',
      items: [{ id: uid(), desc: lead?.value ? 'Website design & development' : '', qty: 1, rate: lead?.value || 0 }],
      taxPct: settings.taxPct, discount: 0, notes: '', terms: settings.terms,
    }
  }

  useEffect(() => {
    if (!docIntent) return
    if (docIntent.docId) setEdit(docs.find((d) => d.id === docIntent.docId) || null)
    else if (docIntent.type) setEdit(blank(docIntent.type, docIntent.leadId))
    clearDocIntent()
  }, [docIntent])

  const list = docs.filter((d) => tab === 'All' || d.type === tab.slice(0, -1))
  const client = (d) => leads.find((l) => l.id === d.leadId)
  const pdf = (d) => generatePDF(d, client(d), settings)
  const preview = (d) => window.open(generatePDF(d, client(d), settings, { save: false }).output('bloburl'), '_blank')

  const toInvoice = (q) => {
    const inv = { ...q, id: uid(), type: 'Invoice', number: nextNumber(docs, 'Invoice'), date: today(), dueDate: addDays(15), status: 'Draft', items: q.items.map((i) => ({ ...i, id: uid() })), fromQuote: q.number }
    saveDoc(inv)
    setEdit(inv)
    toast('Invoice created from ' + q.number)
  }

  const setItem = (id, patch) => setEdit((e) => ({ ...e, items: e.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
  const t = edit ? docTotals(edit) : null

  return (
    <Page
      title="Quotes & Invoices"
      sub="Create, download and track PDF quotations and invoices"
      actions={
        <>
          <button className="btn" onClick={() => setEdit(blank('Quotation'))}><FileText size={14} /> New quotation</button>
          <button className="btn primary" onClick={() => setEdit(blank('Invoice'))}><Receipt size={14} /> New invoice</button>
        </>
      }
    >
      <div style={{ marginBottom: 14 }}><Tabs id="docs" value={tab} onChange={setTab} options={['All', 'Quotations', 'Invoices']} /></div>
      <div className="card" style={{ overflowX: 'auto' }}>
        {list.length === 0 ? <Empty icon={FileText} text="No documents yet." /> : (
          <table className="t">
            <thead><tr><th>Number</th><th>Client</th><th>Date</th><th>Status</th><th className="right">Total</th><th></th></tr></thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} onClick={() => setEdit(d)}>
                  <td><div className="name">{d.number}</div><div className="sub">{d.type}</div></td>
                  <td>{client(d)?.name || d.clientName || '—'}</td>
                  <td className="sub">{fmtDate(d.date)}</td>
                  <td><DocBadge status={d.status} /></td>
                  <td className="right">{money(docTotals(d).total, settings.currency)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      {d.type === 'Quotation' && <button className="btn sm" title="Convert to invoice" onClick={() => toInvoice(d)}><Copy size={13} /> Invoice</button>}
                      <button className="btn sm icon" title="Preview" onClick={() => preview(d)}><Eye size={13} /></button>
                      <button className="btn sm icon" title="Download PDF" onClick={() => pdf(d)}><Download size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit ? `${edit.type} ${edit.number}` : ''} footer={edit && (
        <>
          {docs.some((d) => d.id === edit.id) && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => { if (confirm('Delete this document?')) { deleteDoc(edit.id); setEdit(null) } }}><Trash2 size={14} /> Delete</button>}
          <button className="btn" onClick={() => preview(edit)}><Eye size={14} /> Preview</button>
          <button className="btn" onClick={() => { saveDoc(edit); pdf(edit) }}><Download size={14} /> Save & download PDF</button>
          <button className="btn primary" onClick={() => { saveDoc(edit); setEdit(null); toast('Saved') }}>Save</button>
        </>
      )}>
        {edit && (
          <>
            <div className="grid3">
              <label className="f">
                Client
                <select className="input" value={edit.leadId} onChange={(e) => setEdit({ ...edit, leadId: e.target.value })}>
                  <option value="">— Type a name instead —</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
              {!edit.leadId ? (
                <label className="f">Client name<input className="input" value={edit.clientName} onChange={(e) => setEdit({ ...edit, clientName: e.target.value })} /></label>
              ) : <div />}
              <label className="f">
                Status
                <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  {STATUSES[edit.type].map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="f">Number<input className="input" value={edit.number} onChange={(e) => setEdit({ ...edit, number: e.target.value })} /></label>
              <label className="f">Date<input className="input" type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></label>
              <label className="f">{edit.type === 'Invoice' ? 'Due date' : 'Valid until'}<input className="input" type="date" value={edit.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} /></label>
              <label className="f" style={{ gridColumn: '1 / -1' }}>Subject<input className="input" value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></label>
            </div>

            <table className="items-t" style={{ width: '100%' }}>
              <thead><tr className="sub" style={{ fontSize: 12, color: 'var(--muted)' }}><td>Description</td><td style={{ width: 80 }}>Qty</td><td style={{ width: 130 }}>Rate</td><td style={{ width: 120 }} className="right">Amount</td><td style={{ width: 36 }} /></tr></thead>
              <tbody>
                {edit.items.map((it) => (
                  <tr key={it.id}>
                    <td><input className="input" placeholder="e.g. 5-page responsive website" value={it.desc} onChange={(e) => setItem(it.id, { desc: e.target.value })} /></td>
                    <td><input className="input" type="number" min={0} value={it.qty} onChange={(e) => setItem(it.id, { qty: Number(e.target.value) })} /></td>
                    <td><input className="input" type="number" min={0} value={it.rate} onChange={(e) => setItem(it.id, { rate: Number(e.target.value) })} /></td>
                    <td className="right">{money(it.qty * it.rate, settings.currency)}</td>
                    <td><button className="btn icon sm ghost" onClick={() => setEdit({ ...edit, items: edit.items.filter((x) => x.id !== it.id) })}><X size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row">
              <button className="btn sm" onClick={() => setEdit({ ...edit, items: [...edit.items, { id: uid(), desc: '', qty: 1, rate: 0 }] })}><Plus size={13} /> Add item</button>
            </div>

            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="grid2 grow" style={{ minWidth: 260 }}>
                <label className="f">Discount ({settings.currency})<input className="input" type="number" min={0} value={edit.discount} onChange={(e) => setEdit({ ...edit, discount: Number(e.target.value) })} /></label>
                <label className="f">Tax / GST %<input className="input" type="number" min={0} value={edit.taxPct} onChange={(e) => setEdit({ ...edit, taxPct: Number(e.target.value) })} /></label>
              </div>
              <div className="totals">
                <div><span>Subtotal</span><span>{money(t.sub, settings.currency)}</span></div>
                {t.disc > 0 && <div><span>Discount</span><span>− {money(t.disc, settings.currency)}</span></div>}
                <div><span>Tax ({edit.taxPct}%)</span><span>{money(t.tax, settings.currency)}</span></div>
                <div className="grand"><span>Total</span><span>{money(t.total, settings.currency)}</span></div>
              </div>
            </div>
            <div className="grid2">
              <label className="f">Notes<textarea className="input" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
              <label className="f">Terms<textarea className="input" value={edit.terms} onChange={(e) => setEdit({ ...edit, terms: e.target.value })} /></label>
            </div>
          </>
        )}
      </Modal>
    </Page>
  )
}
