import { createContext, useContext, useEffect, useState, useCallback } from 'react'

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

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults
    const d = JSON.parse(raw)
    return { ...defaults, ...d, settings: { ...defaults.settings, ...d.settings } }
  } catch {
    return defaults
  }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
  }, [state])

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
  const replaceAll = useCallback((d) => setState({ ...defaults, ...d, settings: { ...defaults.settings, ...d.settings } }), [])

  return (
    <Ctx.Provider value={{ ...state, addLeads, updateLead, deleteLeads, logActivity, saveDoc, deleteDoc, updateSettings, replaceAll }}>
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
