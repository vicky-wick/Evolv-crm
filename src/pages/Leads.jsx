import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Download, Upload, Trash2, Users, Check } from 'lucide-react'
import { useStore, STAGES, newLead, toCSV, fromCSV, download, money, projectProgress } from '../store.jsx'
import { Page, Modal, Tabs, StageBadge, ProjectBadge, Bar, Empty, fmtDate, useToast } from '../components/ui.jsx'
import { LeadFields } from '../components/LeadDrawer.jsx'

export default function Leads({ nav }) {
  const { leads, settings, addLeads, deleteLeads, updateLead } = useStore()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [stage, setStage] = useState('All')
  const [view, setView] = useState('Table')
  const [sel, setSel] = useState([])
  const [adding, setAdding] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [over, setOver] = useState(null)
  const fileRef = useRef()

  const list = useMemo(() => {
    const s = q.toLowerCase()
    return leads.filter((l) =>
      (stage === 'All' || l.stage === stage) &&
      (!s || [l.name, l.contact, l.phone, l.email, l.category, l.address].some((v) => (v || '').toLowerCase().includes(s))))
  }, [leads, q, stage])

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const importCSV = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const rows = fromCSV(await file.text()).filter((r) => r.name)
    addLeads(rows.map((r) => ({ ...r, stage: STAGES.includes(r.stage) ? r.stage : 'New' })))
    toast(`Imported ${rows.length} leads`)
    e.target.value = ''
  }

  return (
    <Page
      title="Leads"
      sub={`${leads.length} total · ${leads.filter((l) => l.stage === 'New').length} new`}
      actions={
        <>
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={importCSV} />
          <button className="btn" onClick={() => fileRef.current.click()}><Upload size={14} /> Import</button>
          <button className="btn" onClick={() => download('leads.csv', toCSV(list), 'text/csv')}><Download size={14} /> Export</button>
          <button className="btn primary" onClick={() => setAdding(newLead())}><Plus size={14} /> Add lead</button>
        </>
      }
    >
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="search">
          <Search size={15} />
          <input className="input" placeholder="Search leads…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" style={{ width: 160 }} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option>All</option>
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="grow" />
        {sel.length > 0 && (
          <motion.div className="row" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>{sel.length} selected</span>
            <button className="btn danger" onClick={() => { if (confirm(`Delete ${sel.length} leads?`)) { deleteLeads(sel); setSel([]) } }}><Trash2 size={14} /> Delete</button>
          </motion.div>
        )}
        <Tabs id="leadview" value={view} onChange={setView} options={['Table', 'Pipeline']} />
      </div>

      {leads.length === 0 ? (
        <div className="card">
          <Empty icon={Users} text="No leads yet. Add one manually or pull them from Google Maps." action={
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn" onClick={() => nav.go('finder')}>Open Business Finder</button>
              <button className="btn primary" onClick={() => setAdding(newLead())}><Plus size={14} /> Add lead</button>
            </div>
          } />
        </div>
      ) : view === 'Table' ? (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="t">
            <thead>
              <tr>
                <th style={{ width: 30 }}><input type="checkbox" checked={sel.length === list.length && list.length > 0} onChange={(e) => setSel(e.target.checked ? list.map((l) => l.id) : [])} /></th>
                <th>Business</th><th>Stage</th><th title="Called · Followed up · Work started · Completed · Deployed">Journey</th><th>Project</th><th>Follow-up</th><th className="right">Value</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => {
                const p = l.project, prog = projectProgress(p)
                const dep = !!p && (!!p.deployedAt || ['Deployed', 'Completed'].includes(p.status))
                const flags = [l.called, l.followedUp, !!p, !!p && prog === 100, dep]
                return (
                  <tr key={l.id} onClick={() => nav.openLead(l.id)}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={sel.includes(l.id)} onChange={() => toggle(l.id)} /></td>
                    <td><div className="name">{l.name}</div><div className="sub">{[l.category, l.phone].filter(Boolean).join(' · ') || '—'}</div></td>
                    <td><StageBadge stage={l.stage} /></td>
                    <td>
                      <div className="checks">
                        {flags.map((f, i) => <span key={i} className={'dot' + (f ? ' on' : '')} title={['Called', 'Followed up', 'Work started', 'Completed', 'Deployed'][i]}><Check size={12} /></span>)}
                      </div>
                    </td>
                    <td>{p ? <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><ProjectBadge status={p.status} /><Bar value={prog} /><span className="sub">{prog}%</span></div> : <span className="sub">—</span>}</td>
                    <td className="sub" style={{ color: l.nextFollowUp && l.nextFollowUp < new Date().toISOString().slice(0, 10) ? 'var(--red)' : undefined }}>{fmtDate(l.nextFollowUp)}</td>
                    <td className="right">{l.value ? money(l.value, settings.currency) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {list.length === 0 && <Empty text="No leads match this filter." />}
        </div>
      ) : (
        <div className="kanban">
          {STAGES.map((s) => {
            const items = list.filter((l) => l.stage === s)
            return (
              <div key={s} className={'col' + (over === s ? ' over' : '')}
                onDragOver={(e) => { e.preventDefault(); setOver(s) }}
                onDragLeave={() => setOver(null)}
                onDrop={() => { if (dragId) updateLead(dragId, { stage: s }); setDragId(null); setOver(null) }}>
                <div className="col-h"><span>{s}</span><span>{items.length}</span></div>
                {items.map((l) => (
                  <motion.div layout layoutId={'k' + l.id} key={l.id} className="kcard" draggable onDragStart={() => setDragId(l.id)} onClick={() => nav.openLead(l.id)}>
                    <div style={{ fontWeight: 550 }}>{l.name}</div>
                    <div className="sub" style={{ fontSize: 12, color: 'var(--muted)' }}>{l.category || l.phone || '—'}</div>
                    {l.value > 0 && <div style={{ fontSize: 12, marginTop: 4 }}>{money(l.value, settings.currency)}</div>}
                  </motion.div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!adding} onClose={() => setAdding(null)} title="New lead" footer={
        <>
          <button className="btn" onClick={() => setAdding(null)}>Cancel</button>
          <button className="btn primary" disabled={!adding?.name?.trim()} onClick={() => { addLeads([adding]); setAdding(null); toast('Lead added') }}>Save lead</button>
        </>
      }>
        {adding && <LeadFields lead={adding} set={(p) => setAdding((a) => ({ ...a, ...p }))} />}
      </Modal>
    </Page>
  )
}
