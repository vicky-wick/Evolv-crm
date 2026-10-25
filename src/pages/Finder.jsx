import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Phone, Globe, Star, Loader2, Download, KeyRound, ExternalLink } from 'lucide-react'
import { useStore } from '../store.jsx'
import { Page, Empty, useToast } from '../components/ui.jsx'

const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
  'places.websiteUri', 'places.rating', 'places.userRatingCount', 'places.googleMapsUri', 'places.primaryTypeDisplayName', 'places.businessStatus', 'nextPageToken',
].join(',')

async function searchPlaces(key, textQuery, max, onPage) {
  let token, out = []
  while (out.length < max) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify({ textQuery, pageSize: Math.min(20, max - out.length), ...(token ? { pageToken: token } : {}) }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Request failed (' + res.status + ')')
    out = [...out, ...(data.places || [])]
    onPage(out)
    token = data.nextPageToken
    if (!token) break
  }
  return out
}

export default function Finder({ nav }) {
  const { settings, leads, addLeads } = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('Bhubaneswar')
  const [max, setMax] = useState(20)
  const [results, setResults] = useState([])
  const [sel, setSel] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [noSite, setNoSite] = useState(false)
  const [searched, setSearched] = useState('')

  const known = new Set(leads.map((l) => l.placeId).filter(Boolean))
  const shown = results.filter((r) => !noSite || !r.websiteUri)

  const run = async (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setErr(''); setLoading(true); setResults([]); setSel([])
    const q = location.trim() ? `${query.trim()} in ${location.trim()}` : query.trim()
    setSearched(q)
    try {
      const out = await searchPlaces(settings.placesKey, q, max, setResults)
      setSel(out.filter((r) => !known.has(r.id)).map((r) => r.id))
      if (!out.length) setErr('No businesses found. Try a broader query.')
    } catch (ex) {
      setErr(ex.message)
    }
    setLoading(false)
  }

  const importSel = () => {
    const picked = results.filter((r) => sel.includes(r.id) && !known.has(r.id))
    addLeads(picked.map((r) => ({
      placeId: r.id,
      name: r.displayName?.text || '',
      phone: r.internationalPhoneNumber || r.nationalPhoneNumber || '',
      website: r.websiteUri || '',
      address: r.formattedAddress || '',
      category: r.primaryTypeDisplayName?.text || query,
      source: 'Google Maps',
      mapsUrl: r.googleMapsUri || '',
      notes: [r.rating ? `Rating ${r.rating} (${r.userRatingCount || 0} reviews)` : '', r.websiteUri ? '' : 'No website listed — good web lead.'].filter(Boolean).join(' · '),
    })))
    setSel([])
    toast(`Imported ${picked.length} leads into CRM`)
  }

  if (!settings.placesKey) {
    return (
      <Page title="Business Finder" sub="Pull local businesses from Google Maps straight into your CRM">
        <div className="card pad" style={{ maxWidth: 620 }}>
          <div className="row" style={{ marginBottom: 10 }}><KeyRound size={18} /><b>Connect Google Places API</b></div>
          <ol style={{ color: 'var(--muted)', paddingLeft: 18, margin: '0 0 14px', lineHeight: 1.8 }}>
            <li>Open <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noreferrer">Google Cloud Console → Maps Platform</a> and create a project with billing enabled.</li>
            <li>Enable <b>Places API (New)</b>.</li>
            <li>Create an API key and restrict it to <b>Places API (New)</b> and your site's HTTP referrer.</li>
            <li>Paste it in <b>Settings → Integrations</b>.</li>
          </ol>
          <button className="btn primary" onClick={() => nav.go('settings')}>Go to Settings</button>
        </div>
      </Page>
    )
  }

  return (
    <Page title="Business Finder" sub="Search Google Maps by niche and city, then import leads in one click">
      <form className="card pad row" onSubmit={run} style={{ marginBottom: 14, alignItems: 'flex-end' }}>
        <label className="f grow" style={{ minWidth: 200 }}>
          Business type
          <input className="input" placeholder="salons, gyms, dentists, cafes…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        </label>
        <label className="f grow" style={{ minWidth: 180 }}>
          Location
          <input className="input" placeholder="Bhubaneswar" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="f" style={{ width: 110 }}>
          Max results
          <select className="input" value={max} onChange={(e) => setMax(Number(e.target.value))}>
            {[20, 40, 60].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button className="btn primary" disabled={loading || !query.trim()} style={{ height: 34 }}>
          {loading ? <Loader2 size={14} className="spin" /> : <Search size={14} />} Search
        </button>
      </form>

      {err && <div className="note" style={{ color: 'var(--red)', marginBottom: 14 }}>{err}</div>}

      {results.length > 0 && (
        <div className="row" style={{ marginBottom: 10 }}>
          <span style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--text)' }}>{results.length}</b> results for “{searched}”</span>
          <label className="row" style={{ gap: 6, fontSize: 13, cursor: 'pointer', marginLeft: 12 }}>
            <input type="checkbox" checked={noSite} onChange={(e) => setNoSite(e.target.checked)} /> Only without a website ({results.filter((r) => !r.websiteUri).length})
          </label>
          <div className="grow" />
          <button className="btn sm" onClick={() => setSel(shown.filter((r) => !known.has(r.id)).map((r) => r.id))}>Select all</button>
          <button className="btn sm" onClick={() => setSel([])}>Clear</button>
          <button className="btn primary" disabled={!sel.length} onClick={importSel}><Download size={14} /> Import {sel.length} to CRM</button>
        </div>
      )}

      <div className="card">
        {results.length === 0 && !loading ? (
          <Empty icon={MapPin} text="Try “salons” in “Bhubaneswar”." />
        ) : (
          <AnimatePresence initial={false}>
            {shown.map((r, i) => {
              const dup = known.has(r.id)
              return (
                <motion.label key={r.id} className="result" style={{ cursor: dup ? 'default' : 'pointer', opacity: dup ? 0.55 : 1 }}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: dup ? 0.55 : 1, y: 0 }} transition={{ delay: Math.min(i, 20) * 0.015 }}>
                  <input type="checkbox" disabled={dup} checked={sel.includes(r.id)} onChange={() => setSel((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} />
                  <div className="grow">
                    <div className="row" style={{ gap: 8 }}>
                      <b>{r.displayName?.text}</b>
                      {r.primaryTypeDisplayName?.text && <span className="badge plain">{r.primaryTypeDisplayName.text}</span>}
                      {!r.websiteUri && <span className="badge c-amber">No website</span>}
                      {dup && <span className="badge c-green">In CRM</span>}
                    </div>
                    <div className="meta">
                      <span><MapPin size={12} />{r.formattedAddress}</span>
                      {r.nationalPhoneNumber && <span><Phone size={12} />{r.nationalPhoneNumber}</span>}
                      {r.websiteUri && <span><Globe size={12} /><a href={r.websiteUri} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{new URL(r.websiteUri).hostname}</a></span>}
                      {r.rating && <span><Star size={12} />{r.rating} ({r.userRatingCount})</span>}
                    </div>
                  </div>
                  {r.googleMapsUri && <a className="btn sm icon ghost" href={r.googleMapsUri} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Open in Google Maps"><ExternalLink size={13} /></a>}
                </motion.label>
              )
            })}
          </AnimatePresence>
        )}
        {loading && <div className="empty"><Loader2 className="spin" size={20} /> Fetching businesses…</div>}
      </div>
      <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 12 }}>Results via Google Maps Platform Places API. Data © Google.</p>
    </Page>
  )
}
