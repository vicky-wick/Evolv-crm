import { useState } from 'react'
import { PhoneCall, Phone, Check } from 'lucide-react'
import { useStore, today } from '../store.jsx'
import { Page, Tabs, StageBadge, Empty, fmtDate, useToast } from '../components/ui.jsx'

export default function FollowUps({ nav }) {
  const { leads, logActivity, updateLead } = useStore()
  const toast = useToast()
  const [tab, setTab] = useState('Due')
  const t = today()
  const open = leads.filter((l) => !['Won', 'Lost'].includes(l.stage))
  const groups = {
    Due: open.filter((l) => l.nextFollowUp && l.nextFollowUp <= t),
    Upcoming: open.filter((l) => l.nextFollowUp > t),
    'Never called': open.filter((l) => !l.called),
    'No date': open.filter((l) => l.called && !l.nextFollowUp),
  }
  const list = [...groups[tab]].sort((a, b) => (a.nextFollowUp || '').localeCompare(b.nextFollowUp || ''))

  const markDone = (l, type) => {
    logActivity(l.id, type, type === 'call' ? 'Called' : 'Followed up')
    const next = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10)
    updateLead(l.id, { nextFollowUp: next })
    toast(`Logged · next follow-up ${fmtDate(next)}`)
  }

  return (
    <Page title="Follow-ups" sub="Who to call next, and who you've missed">
      <div style={{ marginBottom: 14 }}>
        <Tabs id="fu" value={tab} onChange={setTab} options={Object.keys(groups)} />
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        {list.length === 0 ? <Empty icon={PhoneCall} text="Nothing here." /> : (
          <table className="t">
            <thead><tr><th>Business</th><th>Stage</th><th>Last activity</th><th>Next follow-up</th><th></th></tr></thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id} onClick={() => nav.openLead(l.id)}>
                  <td><div className="name">{l.name}</div><div className="sub">{l.phone || '—'}</div></td>
                  <td><StageBadge stage={l.stage} /></td>
                  <td className="sub">{l.activities[0] ? l.activities[0].text : 'No activity'}</td>
                  <td className="sub" style={{ color: l.nextFollowUp && l.nextFollowUp < t ? 'var(--red)' : undefined }}>{fmtDate(l.nextFollowUp)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      {l.phone && <a className="btn sm icon" href={'tel:' + l.phone} title="Call"><Phone size={13} /></a>}
                      <button className="btn sm" onClick={() => markDone(l, l.called ? 'followup' : 'call')}><Check size={13} /> {l.called ? 'Followed up' : 'Called'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}
