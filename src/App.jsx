import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, PhoneCall, FolderKanban, MapPin, FileText, BarChart3, Settings as Cog, LogOut, Check, Loader2, AlertCircle, MoreHorizontal, X } from 'lucide-react'
import { supabase } from './supabase.js'
import { useStore, today } from './store.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leads from './pages/Leads.jsx'
import FollowUps from './pages/FollowUps.jsx'
import Projects from './pages/Projects.jsx'
import Finder from './pages/Finder.jsx'
import Documents from './pages/Documents.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import LeadDrawer from './components/LeadDrawer.jsx'

const NAV = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['leads', 'Leads', Users],
  ['followups', 'Follow-ups', PhoneCall],
  ['projects', 'Projects', FolderKanban],
  ['finder', 'Business Finder', MapPin],
  ['documents', 'Quotes & Invoices', FileText],
  ['reports', 'Reports', BarChart3],
  ['settings', 'Settings', Cog],
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [openLead, setOpenLead] = useState(null)
  const [docIntent, setDocIntent] = useState(null)
  const [more, setMore] = useState(false)
  const go = (id) => { setPage(id); setMore(false); document.querySelector('.main')?.scrollTo(0, 0) }
  useLabelTables()
  const { leads, settings, user, syncState, retrySync } = useStore()

  const counts = {
    leads: leads.length,
    followups: leads.filter((l) => l.nextFollowUp && l.nextFollowUp <= today() && !['Won', 'Lost'].includes(l.stage)).length || '',
    projects: leads.filter((l) => l.project && l.project.status !== 'Completed').length || '',
  }

  const nav = {
    go,
    openLead: setOpenLead,
    newDoc: (type, leadId) => { setDocIntent({ type, leadId, k: Date.now() }); setPage('documents'); setOpenLead(null) },
    openDoc: (docId) => { setDocIntent({ docId, k: Date.now() }); setPage('documents'); setOpenLead(null) },
  }

  const Pages = { dashboard: Dashboard, leads: Leads, followups: FollowUps, projects: Projects, finder: Finder, documents: Documents, reports: Reports, settings: Settings }
  const Current = Pages[page]

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="logo">{(settings.agencyName || 'E')[0]}</div>
          {settings.agencyName || 'EVOLV'} CRM
        </div>
        {NAV.map(([id, label, Icon]) => (
          <button key={id} className={'nav' + (page === id ? ' on' : '')} onClick={() => go(id)}>
            {page === id && <motion.div layoutId="navpill" className="pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <Icon size={16} />
            <span>{label}</span>
            {counts[id] ? <span className="count">{counts[id]}</span> : null}
          </button>
        ))}
        <div className="side-user">
          <div className="em" title={user.email}>{user.user_metadata?.full_name || user.email}</div>
          {syncState === 'error'
            ? <button className="sync error" onClick={retrySync}><AlertCircle size={12} /> Not saved, retry</button>
            : <span className="sync">{syncState === 'saving' ? <Loader2 size={12} className="spin" /> : <Check size={12} />}{syncState === 'saving' ? 'Saving…' : 'All changes saved'}</span>}
          <button className="btn sm ghost" style={{ justifyContent: 'flex-start', paddingLeft: 0 }} onClick={() => supabase.auth.signOut()}><LogOut size={13} /> Sign out</button>
        </div>
      </aside>
      <header className="mtop">
        <div className="brand"><div className="logo">{(settings.agencyName || 'E')[0]}</div>{NAV.find(([id]) => id === page)[1]}</div>
        <span className="sync-dot" data-s={syncState} onClick={syncState === 'error' ? retrySync : undefined} title={syncState === 'error' ? 'Not saved, tap to retry' : syncState === 'saving' ? 'Saving…' : 'All changes saved'}>
          {syncState === 'saving' ? <Loader2 size={14} className="spin" /> : syncState === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
        </span>
      </header>
      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div key={page} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
            <Current nav={nav} docIntent={docIntent} clearDocIntent={() => setDocIntent(null)} />
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="mnav">
        {NAV.slice(0, 4).map(([id, label, Icon]) => (
          <button key={id} className={page === id ? 'on' : ''} onClick={() => go(id)}>
            <span className="ic"><Icon size={20} />{id !== 'leads' && counts[id] ? <i>{counts[id]}</i> : null}</span>
            {label}
          </button>
        ))}
        <button className={NAV.slice(4).some(([id]) => id === page) ? 'on' : ''} onClick={() => setMore(true)}>
          <span className="ic"><MoreHorizontal size={20} /></span>More
        </button>
      </nav>
      <AnimatePresence>
        {more && (
          <>
            <motion.div className="overlay" onClick={() => setMore(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 40 }}>
              <div className="sheet-grab" />
              <div className="sheet-user">
                <div><div className="em">{user.user_metadata?.full_name || user.email}</div><div className="sub">{user.email}</div></div>
                <button className="btn icon ghost" onClick={() => setMore(false)}><X size={18} /></button>
              </div>
              {NAV.slice(4).map(([id, label, Icon]) => (
                <button key={id} className={'sheet-item' + (page === id ? ' on' : '')} onClick={() => go(id)}><Icon size={18} />{label}</button>
              ))}
              <div className="sheet-foot">
                {syncState === 'error'
            ? <button className="sync error" onClick={retrySync}><AlertCircle size={12} /> Not saved, retry</button>
            : <span className="sync">{syncState === 'saving' ? <Loader2 size={12} className="spin" /> : <Check size={12} />}{syncState === 'saving' ? 'Saving…' : 'All changes saved'}</span>}
                <button className="btn danger" onClick={() => supabase.auth.signOut()}><LogOut size={14} /> Sign out</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <LeadDrawer id={openLead} onClose={() => setOpenLead(null)} nav={nav} />
    </div>
  )
}

// On phones, tables render as cards; give each cell its column name so CSS can label it.
function useLabelTables() {
  useEffect(() => {
    const label = () => document.querySelectorAll('table.t').forEach((t) => {
      const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim())
      t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => {
        if (heads[i] && td.dataset.l !== heads[i]) td.dataset.l = heads[i]
        const blank = td.textContent.trim() === '—' ? '1' : undefined
        if (td.dataset.blank !== blank) blank ? (td.dataset.blank = blank) : delete td.dataset.blank
      }))
    })
    label()
    const mo = new MutationObserver(label)
    mo.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => mo.disconnect()
  }, [])
}
