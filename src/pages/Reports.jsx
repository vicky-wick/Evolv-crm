import { motion } from 'framer-motion'
import { useStore, STAGES, PROJECT_STATUSES, money, docTotals } from '../store.jsx'
import { Page } from '../components/ui.jsx'

function Bars({ data }) {
  const max = Math.max(1, ...data.map((d) => d[1]))
  return data.map(([k, v], i) => (
    <div key={k} className="hbar">
      <span style={{ color: 'var(--muted)' }}>{k}</span>
      <div className="bar"><motion.div initial={{ width: 0 }} animate={{ width: (v / max) * 100 + '%' }} transition={{ delay: i * 0.04, duration: 0.5 }} /></div>
      <span className="right">{v}</span>
    </div>
  ))
}

export default function Reports() {
  const { leads, docs, settings } = useStore()
  const closed = leads.filter((l) => ['Won', 'Lost'].includes(l.stage))
  const won = leads.filter((l) => l.stage === 'Won')
  const conv = closed.length ? Math.round((won.length / closed.length) * 100) : 0
  const contacted = leads.filter((l) => l.called).length
  const bySource = Object.entries(leads.reduce((a, l) => ({ ...a, [l.source]: (a[l.source] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])
  const projects = leads.filter((l) => l.project)
  const invoiced = docs.filter((d) => d.type === 'Invoice')
  const paid = invoiced.filter((d) => d.status === 'Paid').reduce((a, d) => a + docTotals(d).total, 0)
  const unpaid = invoiced.filter((d) => d.status !== 'Paid').reduce((a, d) => a + docTotals(d).total, 0)
  const pipeline = leads.filter((l) => !['Won', 'Lost'].includes(l.stage)).reduce((a, l) => a + (l.value || 0), 0)

  const kpis = [
    ['Win rate', conv + '%', `${won.length} won of ${closed.length} closed`],
    ['Contact rate', leads.length ? Math.round((contacted / leads.length) * 100) + '%' : '0%', `${contacted} of ${leads.length} called`],
    ['Open pipeline', money(pipeline, settings.currency), 'value of open leads'],
    ['Invoices paid', money(paid, settings.currency), money(unpaid, settings.currency) + ' outstanding'],
  ]

  return (
    <Page title="Reports" sub="How your pipeline and delivery are doing">
      <div className="kpis">
        {kpis.map(([l, v, s]) => (
          <div key={l} className="card kpi"><div className="l">{l}</div><div className="v">{v}</div><div className="s">{s}</div></div>
        ))}
      </div>
      <div className="grid3">
        <div className="card pad"><h3>Pipeline by stage</h3><Bars data={STAGES.map((s) => [s, leads.filter((l) => l.stage === s).length])} /></div>
        <div className="card pad"><h3>Lead sources</h3>{bySource.length ? <Bars data={bySource} /> : <div className="sub">No data</div>}</div>
        <div className="card pad"><h3>Projects by status</h3><Bars data={PROJECT_STATUSES.map((s) => [s, projects.filter((l) => l.project.status === s).length])} /></div>
      </div>
    </Page>
  )
}
