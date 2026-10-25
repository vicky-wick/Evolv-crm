import { motion } from 'framer-motion'
import { Users, PhoneCall, FolderKanban, Rocket, Plus, MapPin, FileText, IndianRupee, Clock } from 'lucide-react'
import { useStore, today, money, projectProgress, docTotals } from '../store.jsx'
import { Page, StageBadge, ProjectBadge, Bar, Empty, ago, fmtDate } from '../components/ui.jsx'

export default function Dashboard({ nav }) {
  const { leads, docs, settings } = useStore()
  const t = today()
  const open = leads.filter((l) => !['Won', 'Lost'].includes(l.stage))
  const due = open.filter((l) => l.nextFollowUp && l.nextFollowUp <= t).sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp))
  const projects = leads.filter((l) => l.project)
  const active = projects.filter((l) => !['Deployed', 'Completed'].includes(l.project.status))
  const deployed = projects.filter((l) => l.project.deployedAt || ['Deployed', 'Completed'].includes(l.project.status))
  const won = leads.filter((l) => l.stage === 'Won')
  const revenue = won.reduce((a, l) => a + (l.value || 0), 0)
  const received = projects.reduce((a, l) => a + (l.project.paid || 0), 0)
  const unpaidInv = docs.filter((d) => d.type === 'Invoice' && d.status !== 'Paid').reduce((a, d) => a + docTotals(d).total, 0)

  const recent = leads
    .flatMap((l) => l.activities.map((a) => ({ ...a, lead: l })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8)

  const kpis = [
    { l: 'Total leads', v: leads.length, s: `${leads.filter((l) => l.stage === 'New').length} new · ${leads.filter((l) => l.stage === 'Interested').length} interested`, i: Users },
    { l: 'Follow-ups due', v: due.length, s: due.filter((l) => l.nextFollowUp < t).length + ' overdue', i: PhoneCall },
    { l: 'Active projects', v: active.length, s: `${deployed.length} deployed`, i: FolderKanban },
    { l: 'Revenue won', v: money(revenue, settings.currency), s: `${money(received, settings.currency)} received · ${money(unpaidInv, settings.currency)} invoiced unpaid`, i: IndianRupee },
  ]

  return (
    <Page
      title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}`}
      sub={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      actions={
        <>
          <button className="btn" onClick={() => nav.go('finder')}><MapPin size={14} /> Find businesses</button>
          <button className="btn" onClick={() => nav.newDoc('Quotation')}><FileText size={14} /> New quote</button>
          <button className="btn primary" onClick={() => nav.go('leads')}><Plus size={14} /> Add lead</button>
        </>
      }
    >
      <div className="kpis">
        {kpis.map((k, i) => (
          <motion.div key={k.l} className="card kpi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="l"><k.i size={14} />{k.l}</div>
            <div className="v">{k.v}</div>
            <div className="s">{k.s}</div>
          </motion.div>
        ))}
      </div>

      <div className="split">
        <div className="card pad">
          <h3>Follow-ups due today</h3>
          {due.length === 0 ? <Empty icon={Clock} text="You're all caught up." /> : due.slice(0, 8).map((l) => (
            <div key={l.id} className="list-row" onClick={() => nav.openLead(l.id)}>
              <div className="grow"><div style={{ fontWeight: 550 }}>{l.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{l.phone || l.category}</div></div>
              <StageBadge stage={l.stage} />
              <span style={{ fontSize: 12, color: l.nextFollowUp < t ? 'var(--red)' : 'var(--muted)', width: 90, textAlign: 'right' }}>{l.nextFollowUp < t ? 'Overdue' : 'Today'}</span>
            </div>
          ))}
        </div>
        <div className="card pad">
          <h3>Recent activity</h3>
          {recent.length === 0 ? <Empty text="Log calls and follow-ups from any lead." /> : recent.map((a) => (
            <div key={a.id} className="list-row" onClick={() => nav.openLead(a.lead.id)}>
              <div className="grow" style={{ fontSize: 13 }}><b>{a.lead.name}</b> — {a.text}</div>
              <span style={{ fontSize: 12, color: 'var(--faint)' }}>{ago(a.at)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 16 }}>
        <h3>Active projects</h3>
        {active.length === 0 ? <Empty icon={Rocket} text="Start work on a won lead to track it here." /> : active.map((l) => {
          const pr = projectProgress(l.project)
          return (
            <div key={l.id} className="list-row" onClick={() => nav.openLead(l.id)}>
              <div className="grow" style={{ fontWeight: 550 }}>{l.name}</div>
              <ProjectBadge status={l.project.status} />
              <div style={{ width: 160 }}><Bar value={pr} /></div>
              <span style={{ width: 40, fontSize: 12, textAlign: 'right' }}>{pr}%</span>
              <span style={{ width: 100, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>{l.project.deadline ? 'Due ' + fmtDate(l.project.deadline) : ''}</span>
            </div>
          )
        })}
      </div>
    </Page>
  )
}
