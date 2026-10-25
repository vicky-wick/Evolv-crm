import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, MessageSquare, StickyNote, Check, Hammer, Gauge, Rocket, Trash2, Plus, FileText, Receipt, ExternalLink, X } from 'lucide-react'
import { useStore, STAGES, PROJECT_STATUSES, SOURCES, newProject, projectProgress, today, uid, money, docTotals } from '../store.jsx'
import { Drawer, Bar, DocBadge, ago, fmtDate, useToast } from './ui.jsx'

export function LeadFields({ lead, set }) {
  const f = (k, label, props = {}) => (
    <label className="f">
      {label}
      <input className="input" value={lead[k] ?? ''} onChange={(e) => set({ [k]: props.type === 'number' ? Number(e.target.value) : e.target.value })} {...props} />
    </label>
  )
  return (
    <div className="grid2">
      {f('name', 'Business name', { placeholder: 'Glow Salon' })}
      {f('contact', 'Contact person')}
      {f('phone', 'Phone')}
      {f('email', 'Email', { type: 'email' })}
      {f('website', 'Website')}
      {f('category', 'Category', { placeholder: 'Salon' })}
      <div className="span2">{f('address', 'Address')}</div>
      <label className="f">
        Stage
        <select className="input" value={lead.stage} onChange={(e) => set({ stage: e.target.value })}>
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="f">
        Source
        <select className="input" value={lead.source} onChange={(e) => set({ source: e.target.value })}>
          {SOURCES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      {f('value', 'Deal value', { type: 'number', min: 0 })}
      {f('nextFollowUp', 'Next follow-up', { type: 'date' })}
      <label className="f span2">
        Notes
        <textarea className="input" value={lead.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>
    </div>
  )
}

const ICONS = { call: Phone, followup: MessageSquare, note: StickyNote, project: Hammer, deploy: Rocket }

export default function LeadDrawer({ id, onClose, nav }) {
  const { leads, docs, settings, updateLead, deleteLeads, logActivity } = useStore()
  const toast = useToast()
  const lead = leads.find((l) => l.id === id)
  const [actType, setActType] = useState('call')
  const [actText, setActText] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [taskText, setTaskText] = useState('')

  const set = (patch) => updateLead(id, patch)
  const setProj = (patch) => updateLead(id, (l) => ({ project: { ...l.project, ...patch } }))

  if (!lead) return <Drawer open={false} onClose={onClose} />

  const p = lead.project
  const prog = projectProgress(p)
  const deployed = !!p && (!!p.deployedAt || ['Deployed', 'Completed'].includes(p.status))
  const leadDocs = docs.filter((d) => d.leadId === id)

  const startWork = () => {
    if (p) {
      if (confirm('Remove the project from this lead? Task and progress data will be lost.')) set({ project: null })
      return
    }
    set({ project: { ...newProject(), status: 'In Progress' }, stage: 'Won' })
    logActivity(id, 'project', 'Work started')
  }
  const toggleComplete = () => {
    if (!p) return toast('Start the work first')
    if (prog === 100) setProj({ progress: 90, autoProgress: false, status: 'In Progress' })
    else setProj({ progress: 100, autoProgress: false, status: deployed ? p.status : 'Ready to Deploy' })
  }
  const toggleDeploy = () => {
    if (!p) return toast('Start the work first')
    if (deployed) setProj({ status: 'Ready to Deploy', deployedAt: '' })
    else {
      setProj({ status: 'Deployed', deployedAt: today(), progress: 100, autoProgress: false })
      logActivity(id, 'deploy', 'Project deployed' + (p.liveUrl ? ' → ' + p.liveUrl : ''))
    }
  }

  const steps = [
    { label: 'Called', on: lead.called, icon: Phone, click: () => set({ called: !lead.called }) },
    { label: 'Followed up', on: lead.followedUp, icon: MessageSquare, click: () => set({ followedUp: !lead.followedUp }) },
    { label: 'Work started', on: !!p, icon: Hammer, click: startWork },
    { label: p ? prog + '% done' : 'Progress', on: !!p && prog > 0, icon: Gauge, static: true },
    { label: 'Completed', on: !!p && prog === 100, icon: Check, click: toggleComplete },
    { label: 'Deployed', on: deployed, icon: Rocket, click: toggleDeploy },
  ]

  const addActivity = () => {
    const label = { call: 'Called', followup: 'Followed up', note: 'Note' }[actType]
    logActivity(id, actType, actText.trim() || label)
    if (nextDate) set({ nextFollowUp: nextDate })
    else if (actType !== 'note') set({ nextFollowUp: '' })
    setActText(''); setNextDate('')
    toast('Activity logged')
  }

  const addTask = () => {
    if (!taskText.trim()) return
    setProj({ tasks: [...p.tasks, { id: uid(), text: taskText.trim(), done: false }] })
    setTaskText('')
  }

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={lead.name || 'Untitled lead'}
      actions={
        <button className="btn icon ghost danger" title="Delete lead" onClick={() => { if (confirm('Delete this lead?')) { deleteLeads([id]); onClose() } }}>
          <Trash2 size={16} />
        </button>
      }
    >
      <section>
        <div className="section-t">Client journey</div>
        <div className="journey">
          {steps.map((s) => (
            <motion.button key={s.label} whileTap={s.static ? undefined : { scale: 0.95 }} className={'step' + (s.on ? ' on' : '') + (s.static ? ' static' : '')} onClick={s.click}>
              <s.icon size={16} />
              {s.label}
            </motion.button>
          ))}
        </div>
      </section>

      <section>
        <div className="section-t">Log activity</div>
        <div className="row" style={{ marginBottom: 8 }}>
          {[['call', 'Call', Phone], ['followup', 'Follow-up', MessageSquare], ['note', 'Note', StickyNote]].map(([t, l, I]) => (
            <button key={t} className={'btn sm' + (actType === t ? ' primary' : '')} onClick={() => setActType(t)}><I size={13} />{l}</button>
          ))}
        </div>
        <div className="row">
          <input className="input grow" style={{ width: 'auto' }} placeholder={actType === 'call' ? 'Outcome — e.g. interested, call back Monday' : 'What happened?'} value={actText} onChange={(e) => setActText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addActivity()} />
          <input className="input" style={{ width: 150 }} type="date" title="Next follow-up" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          <button className="btn primary" onClick={addActivity}>Log</button>
        </div>
        <div className="sub" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
          Next follow-up: <b>{fmtDate(lead.nextFollowUp)}</b> · pick a date to schedule the next one
        </div>
        {lead.activities.length > 0 && (
          <div className="timeline" style={{ marginTop: 10 }}>
            <AnimatePresence initial={false}>
              {lead.activities.slice(0, 12).map((a) => {
                const I = ICONS[a.type] || StickyNote
                return (
                  <motion.div key={a.id} className="tl" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <div className="ic"><I size={13} /></div>
                    <div className="grow">{a.text}</div>
                    <div className="when">{ago(a.at)}</div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {p && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="section-t">Project</div>
          <div className="grid2">
            <label className="f">
              Status
              <select className="input" value={p.status} onChange={(e) => setProj({ status: e.target.value, ...(e.target.value === 'Deployed' && !p.deployedAt ? { deployedAt: today() } : {}) })}>
                {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="f">
              Deadline
              <input className="input" type="date" value={p.deadline} onChange={(e) => setProj({ deadline: e.target.value })} />
            </label>
            <label className="f span2">
              <span className="row">
                <span className="grow">Progress — {prog}%</span>
                <label className="row" style={{ gap: 5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={p.autoProgress} onChange={(e) => setProj({ autoProgress: e.target.checked })} /> from tasks
                </label>
              </span>
              {p.autoProgress ? <Bar value={prog} /> : <input type="range" min={0} max={100} step={5} value={p.progress} onChange={(e) => setProj({ progress: Number(e.target.value) })} />}
            </label>
            <label className="f">
              Live URL
              <input className="input" placeholder="https://" value={p.liveUrl} onChange={(e) => setProj({ liveUrl: e.target.value })} />
            </label>
            <label className="f">
              Deployed on
              <input className="input" type="date" value={p.deployedAt} onChange={(e) => setProj({ deployedAt: e.target.value })} />
            </label>
            <label className="f">
              Amount received
              <input className="input" type="number" min={0} value={p.paid} onChange={(e) => setProj({ paid: Number(e.target.value) })} />
            </label>
            <div className="f" style={{ justifyContent: 'flex-end' }}>
              <span>Pending: <b style={{ color: 'var(--text)' }}>{money(Math.max(0, lead.value - p.paid), settings.currency)}</b></span>
            </div>
          </div>
          {p.liveUrl && <a className="btn sm" style={{ marginTop: 10 }} href={p.liveUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open live site</a>}

          <div className="section-t" style={{ marginTop: 18 }}>Tasks · {p.tasks.filter((t) => t.done).length}/{p.tasks.length}</div>
          <AnimatePresence initial={false}>
            {p.tasks.map((t) => (
              <motion.div key={t.id} className={'task' + (t.done ? ' done' : '')} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}>
                <input type="checkbox" checked={t.done} onChange={() => setProj({ tasks: p.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })} />
                <span className="grow">{t.text}</span>
                <button className="btn icon sm ghost" onClick={() => setProj({ tasks: p.tasks.filter((x) => x.id !== t.id) })}><X size={13} /></button>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="row" style={{ marginTop: 6 }}>
            <input className="input grow" style={{ width: 'auto' }} placeholder="Add a task — e.g. Homepage design" value={taskText} onChange={(e) => setTaskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
            <button className="btn" onClick={addTask}><Plus size={14} /> Add</button>
          </div>
        </motion.section>
      )}

      <section>
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="section-t grow" style={{ margin: 0 }}>Quotes & invoices</div>
          <button className="btn sm" onClick={() => nav.newDoc('Quotation', id)}><FileText size={13} /> Quotation</button>
          <button className="btn sm" onClick={() => nav.newDoc('Invoice', id)}><Receipt size={13} /> Invoice</button>
        </div>
        {leadDocs.length === 0 ? (
          <div className="note">No documents yet for this client.</div>
        ) : (
          leadDocs.map((d) => (
            <div key={d.id} className="list-row" onClick={() => nav.openDoc(d.id)}>
              <span className="grow"><b>{d.number}</b> · {d.type}</span>
              <span>{money(docTotals(d).total, settings.currency)}</span>
              <DocBadge status={d.status} />
            </div>
          ))
        )}
      </section>

      <section>
        <div className="section-t">Details</div>
        <LeadFields lead={lead} set={set} />
      </section>
    </Drawer>
  )
}
