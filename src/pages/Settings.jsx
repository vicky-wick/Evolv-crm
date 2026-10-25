import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { useStore, download } from '../store.jsx'
import { Page, useToast } from '../components/ui.jsx'

export default function Settings() {
  const store = useStore()
  const { settings, updateSettings, replaceAll } = store
  const toast = useToast()
  const fileRef = useRef()

  const f = (k, label, props = {}) => (
    <label className="f">
      {label}
      <input className="input" value={settings[k] ?? ''} onChange={(e) => updateSettings({ [k]: props.type === 'number' ? Number(e.target.value) : e.target.value })} {...props} />
    </label>
  )

  const restore = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const d = JSON.parse(await file.text())
      if (!Array.isArray(d.leads)) throw new Error()
      if (confirm('Replace all current data with this backup?')) { replaceAll(d); toast('Backup restored') }
    } catch { toast('That file is not a valid backup') }
    e.target.value = ''
  }

  return (
    <Page title="Settings" sub="Your agency details appear on quotations and invoices">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
        <div className="card pad">
          <h3>Agency profile</h3>
          <div className="grid2">
            {f('agencyName', 'Agency name')}
            {f('tagline', 'Tagline')}
            {f('email', 'Email')}
            {f('phone', 'Phone')}
            <div className="span2">{f('address', 'Address')}</div>
            {f('gstin', 'GSTIN')}
            <div className="grid2">
              {f('currency', 'Currency symbol')}
              {f('taxPct', 'Default tax %', { type: 'number', min: 0 })}
            </div>
            <label className="f span2">Bank / UPI details (shown on invoices)<textarea className="input" value={settings.bank} onChange={(e) => updateSettings({ bank: e.target.value })} placeholder={'Bank: …  A/C: …  IFSC: …\nUPI: name@bank'} /></label>
            <label className="f span2">Default terms<textarea className="input" value={settings.terms} onChange={(e) => updateSettings({ terms: e.target.value })} /></label>
          </div>
        </div>

        <div className="card pad">
          <h3>Integrations</h3>
          {f('placesKey', 'Google Places API (New) key', { type: 'password', placeholder: 'AIza…', autoComplete: 'off' })}
          <div className="note" style={{ marginTop: 10 }}>
            Used by Business Finder. Stored only in this browser. Restrict the key to <b>Places API (New)</b> and your domain in Google Cloud Console. Text Search is billed per request by Google.
          </div>
        </div>

        <div className="card pad">
          <h3>Data & backup</h3>
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>All data lives in this browser's local storage. Download a backup regularly.</p>
          <div className="row">
            <button className="btn" onClick={() => download(`evolv-crm-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ leads: store.leads, docs: store.docs, settings }, null, 2), 'application/json')}><Download size={14} /> Download backup</button>
            <input ref={fileRef} type="file" accept=".json" hidden onChange={restore} />
            <button className="btn" onClick={() => fileRef.current.click()}><Upload size={14} /> Restore backup</button>
          </div>
        </div>
      </div>
    </Page>
  )
}
