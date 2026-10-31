import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, PhoneCall, FolderKanban, MapPin, FileText, BarChart3, Settings as Cog, LogOut, Check, Loader2, AlertCircle } from 'lucide-react'
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
  const { leads, settings, user, syncState, retrySync } = useStore()

  const counts = {
    leads: leads.length,
    followups: leads.filter((l) => l.nextFollowUp && l.nextFollowUp <= today() && !['Won', 'Lost'].includes(l.stage)).length || '',
    projects: leads.filter((l) => l.project && l.project.status !== 'Completed').length || '',
  }

  const nav = {
    go: setPage,
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
          <button key={id} className={'nav' + (page === id ? ' on' : '')} onClick={() => setPage(id)}>
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
      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div key={page} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
            <Current nav={nav} docIntent={docIntent} clearDocIntent={() => setDocIntent(null)} />
          </motion.div>
        </AnimatePresence>
      </main>
      <LeadDrawer id={openLead} onClose={() => setOpenLead(null)} nav={nav} />
    </div>
  )
}
