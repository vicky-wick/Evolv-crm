import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from './supabase.js'

const KEY = 'evolv-crm-v1'

export const STAGES = ['New', 'Contacted', 'Interested', 'Proposal Sent', 'Won', 'Lost']
export const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Testing', 'Ready to Deploy', 'Deployed', 'Completed']
export const SOURCES = ['Google Maps', 'Referral', 'Instagram', 'Website', 'Cold Call', 'Other']

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
export const today = () => new Date().toISOString().slice(0, 10)

export const newLead = (data = {}) => ({
  id: uid(),
  name: '',
  contact: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  category: '',
  source: 'Other',
  stage: 'New',
  value: 0,
  notes: '',
  called: false,
  followedUp: false,
  nextFollowUp: '',
  activities: [],
  project: null,
  createdAt: new Date().toISOString(),
  ...data,
})

export const newProject = () => ({
  status: 'Not Started',
  progress: 0,
  autoProgress: false,
  tasks: [],
  startDate: today(),
  deadline: '',
  liveUrl: '',
  deployedAt: '',
  paid: 0,
})

const defaults = {
  leads: [],
  docs: [],
  settings: {
    agencyName: 'EVOLV',
    tagline: 'Web Design & Development',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    currency: '₹',
    taxPct: 18,
    bank: '',
    terms: 'Payment due within 15 days. 50% advance required to start work.',
    placesKey: '',
  },
}

const LEGACY_KEY = KEY

const toLeadRow = (l) => ({
  id: l.id, name: l.name || '', contact: l.contact || '', phone: l.phone || '', email: l.email || '',
  website: l.website || '', address: l.address || '', category: l.category || '', source: l.source || 'Other',
  stage: l.stage || 'New', value: Number(l.value) || 0, notes: l.notes || '', called: !!l.called,
  followed_up: !!l.followedUp, next_follow_up: l.nextFollowUp || null, activities: l.activities || [],
  project: l.project || null, created_at: l.createdAt || new Date().toISOString(),
})
const fromLeadRow = (r) => newLead({
  id: r.id, name: r.name, contact: r.contact, phone: r.phone, email: r.email, website: r.website,
  address: r.address, category: r.category, source: r.source, stage: r.stage, value: Number(r.value),
  notes: r.notes, called: r.called, followedUp: r.followed_up, nextFollowUp: r.next_follow_up || '',
  activities: r.activities || [], project: r.project, createdAt: r.created_at,
})
const toDocRow = (d) => ({ id: d.id, type: d.type, number: d.number, lead_id: d.leadId || null, data: d })

// Push every lead/doc whose object identity changed since the last sync, delete the ones that disappeared.
async function sync(prev, next) {
  const changed = (a, b) => {
    const old = new Map(a.map((x) => [x.id, x]))
    const ids = new Set(b.map((x) => x.id))
    return { up: b.filter((x) => old.get(x.id) !== x), del: a.filter((x) => !ids.has(x.id)).map((x) => x.id) }
  }
  const L = changed(prev.leads, next.leads)
  const D = changed(prev.docs, next.docs)
  const ops = []
  if (L.up.length) ops.push(supabase.from('leads').upsert(L.up.map(toLeadRow)))
  if (L.del.length) ops.push(supabase.from('leads').delete().in('id', L.del))
  if (D.up.length) ops.push(supabase.from('documents').upsert(D.up.map(toDocRow)))
  if (D.del.length) ops.push(supabase.from('documents').delete().in('id', D.del))
  if (prev.settings !== next.settings) ops.push(supabase.from('settings').upsert({ user_id: next.userId, data: next.settings }))
  const errs = (await Promise.all(ops)).map((r) => r.error).filter(Boolean)
  if (errs.length) throw errs[0]
}

const Ctx = createContext(null)

export function StoreProvider({ user, children }) {
  const [state, setState] = useState(null)
  const [syncState, setSyncState] = useState('saved')
  const synced = useRef(null)
  const timer = useRef()

  useEffect(() => {
    let live = true
    ;(async () => {
      const [l, d, s] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('documents').select('data').order('created_at', { ascending: false }),
        supabase.from('settings').select('data').maybeSingle(),
      ])
      if (!live) return
      const err = l.error || d.error || s.error
      if (err) { setState({ error: err.message }); return }
      const loaded = {
        userId: user.id,
        leads: l.data.map(fromLeadRow),
        docs: d.data.map((r) => r.data),
        settings: { ...defaults.settings, ...(s.data?.data || {}) },
      }
      synced.current = loaded
      setState(loaded)
    })()
    return () => { live = false }
  }, [user.id])

  useEffect(() => {
    if (!state || state.error || state === synced.current) return
    setSyncState('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const prev = synced.current
      try {
        await sync(prev, state)
        synced.current = state
        setSyncState('saved')
      } catch (e) {
        console.error(e)
        setSyncState('error')
      }
    }, 500)
  }, [state])

  useEffect(() => {
    const warn = (e) => { if (syncState === 'saving') { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [syncState])

  const addLeads = useCallback((list) => setState((s) => ({ ...s, leads: [...list.map((l) => newLead(l)), ...s.leads] })), [])
  const updateLead = useCallback((id, patch) =>
    setState((s) => ({ ...s, leads: s.leads.map((l) => (l.id === id ? { ...l, ...(typeof patch === 'function' ? patch(l) : patch) } : l)) })), [])
  const deleteLeads = useCallback((ids) => setState((s) => ({ ...s, leads: s.leads.filter((l) => !ids.includes(l.id)) })), [])
  const logActivity = useCallback((id, type, text) =>
    setState((s) => ({
      ...s,
      leads: s.leads.map((l) => {
        if (l.id !== id) return l
        const patch = { activities: [{ id: uid(), type, text, at: new Date().toISOString() }, ...l.activities] }
        if (type === 'call') patch.called = true
        if (type === 'followup') patch.followedUp = true
        if (l.stage === 'New' && (type === 'call' || type === 'followup')) patch.stage = 'Contacted'
        return { ...l, ...patch }
      }),
    })), [])

  const saveDoc = useCallback((doc) =>
    setState((s) => ({ ...s, docs: s.docs.some((d) => d.id === doc.id) ? s.docs.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...s.docs] })), [])
  const deleteDoc = useCallback((id) => setState((s) => ({ ...s, docs: s.docs.filter((d) => d.id !== id) })), [])
  const updateSettings = useCallback((patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })), [])
  const retrySync = useCallback(() => setState((s) => ({ ...s })), [])
  const replaceAll = useCallback((d) => setState((s) => ({
    ...s,
    leads: (d.leads || []).map((l) => newLead(l)),
    docs: [...(d.docs || [])],
    settings: { ...defaults.settings, ...d.settings },
  })), [])

  const legacy = (() => {
    try { const d = JSON.parse(localStorage.getItem(LEGACY_KEY)); return d?.leads?.length || d?.docs?.length ? d : null } catch { return null }
  })()
  const importLegacy = useCallback(() => {
    if (!legacy) return
    setState((s) => ({
      ...s,
      leads: [...legacy.leads.map((l) => newLead(l)).filter((l) => !s.leads.some((x) => x.id === l.id)), ...s.leads],
      docs: [...(legacy.docs || []).filter((d) => !s.docs.some((x) => x.id === d.id)), ...s.docs],
      settings: { ...s.settings, ...legacy.settings },
    }))
    try { localStorage.removeItem(LEGACY_KEY) } catch {}
  }, [legacy])

  if (!state) return <div className="boot"><Loader2 className="spin" size={20} /></div>
  if (state.error) return <div className="boot"><div className="note">Could not load your data: {state.error}<br />Did you run <code>supabase/migrations/0001_init.sql</code>?</div></div>

  return (
    <Ctx.Provider value={{ ...state, user, syncState, legacy, importLegacy, retrySync, addLeads, updateLead, deleteLeads, logActivity, saveDoc, deleteDoc, updateSettings, replaceAll }}>
      {children}
    </Ctx.Provider>
  )
}

export const useStore = () => useContext(Ctx)

export const money = (n, cur = '₹') => cur + ' ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export const projectProgress = (p) => {
  if (!p) return 0
  if (p.autoProgress && p.tasks.length) return Math.round((p.tasks.filter((t) => t.done).length / p.tasks.length) * 100)
  return p.progress
}

export const docTotals = (doc) => {
  const sub = doc.items.reduce((a, i) => a + Number(i.qty || 0) * Number(i.rate || 0), 0)
  const disc = Number(doc.discount || 0)
  const taxable = Math.max(0, sub - disc)
  const tax = (taxable * Number(doc.taxPct || 0)) / 100
  return { sub, disc, taxable, tax, total: taxable + tax }
}

export function toCSV(rows) {
  const cols = ['name', 'contact', 'phone', 'email', 'website', 'address', 'category', 'source', 'stage', 'value', 'nextFollowUp', 'notes']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

export function fromCSV(text) {
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()))
  if (!head) return []
  const keys = head.map((h) => h.trim())
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, k === 'value' ? Number(r[i]) || 0 : r[i] ?? ''])))
}

export function download(name, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
