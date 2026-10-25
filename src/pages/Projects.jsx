import { useState } from 'react'
import { FolderKanban, ExternalLink } from 'lucide-react'
import { useStore, PROJECT_STATUSES, projectProgress, money } from '../store.jsx'
import { Page, Tabs, ProjectBadge, Bar, Empty, fmtDate } from '../components/ui.jsx'

export default function Projects({ nav }) {
  const { leads, settings } = useStore()
  const [tab, setTab] = useState('All')
  const all = leads.filter((l) => l.project)
  const list = tab === 'All' ? all : all.filter((l) => l.project.status === tab)

  return (
    <Page title="Projects" sub={`${all.length} projects · ${all.filter((l) => projectProgress(l.project) === 100).length} at 100%`}>
      <div style={{ marginBottom: 14, overflowX: 'auto' }}>
        <Tabs id="proj" value={tab} onChange={setTab} options={['All', ...PROJECT_STATUSES]} />
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        {list.length === 0 ? (
          <Empty icon={FolderKanban} text="Open a lead and click “Work started” to create a project." />
        ) : (
          <table className="t">
            <thead><tr><th>Client</th><th>Status</th><th>Progress</th><th>Tasks</th><th>Deadline</th><th>Deployed</th><th className="right">Paid / Value</th></tr></thead>
            <tbody>
              {list.map((l) => {
                const p = l.project, pr = projectProgress(p)
                const late = p.deadline && p.deadline < new Date().toISOString().slice(0, 10) && pr < 100
                return (
                  <tr key={l.id} onClick={() => nav.openLead(l.id)}>
                    <td><div className="name">{l.name}</div><div className="sub">{l.category}</div></td>
                    <td><ProjectBadge status={p.status} /></td>
                    <td><div className="row" style={{ flexWrap: 'nowrap' }}><div style={{ width: 120 }}><Bar value={pr} /></div><span className="sub">{pr}%</span></div></td>
                    <td className="sub">{p.tasks.filter((t) => t.done).length}/{p.tasks.length}</td>
                    <td className="sub" style={{ color: late ? 'var(--red)' : undefined }}>{fmtDate(p.deadline)}</td>
                    <td className="sub">
                      {p.deployedAt ? fmtDate(p.deployedAt) : '—'}
                      {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ marginLeft: 6 }}><ExternalLink size={12} /></a>}
                    </td>
                    <td className="right sub">{money(p.paid, settings.currency)} / {money(l.value, settings.currency)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}
