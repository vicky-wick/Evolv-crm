import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Loader2 } from 'lucide-react'
import App from './App.jsx'
import { StoreProvider } from './store.jsx'
import { ToastProvider } from './components/ui.jsx'
import { supabase, configured } from './supabase.js'
import Landing from './pages/Landing.jsx'
import Auth from './pages/Auth.jsx'
import './styles.css'

const useHash = () => {
  const [hash, setHash] = useState(location.hash.slice(1))
  useEffect(() => {
    const on = () => setHash(location.hash.slice(1))
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return hash
}

function Root() {
  const [session, setSession] = useState(undefined)
  const [recovering, setRecovering] = useState(false)
  const hash = useHash()

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configured) {
    if (hash === '/login' || hash === '/signup' || hash === '/forgot') return (
      <div className="boot"><div className="note" style={{ maxWidth: 460 }}>
        Sign-in isn't available yet: Supabase is not configured. Add <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code>, then restart <code>npm run dev</code>. <a href="#">Back home</a>
      </div></div>
    )
    return <Landing />
  }
  if (session === undefined) return <div className="boot"><Loader2 className="spin" size={20} /></div>

  if (recovering) return <Auth mode="reset" onDone={() => setRecovering(false)} />
  if (session) {
    if (hash === '/login' || hash === '/signup') history.replaceState(null, '', location.pathname)
    return (
      <StoreProvider user={session.user} key={session.user.id}>
        <ToastProvider><App /></ToastProvider>
      </StoreProvider>
    )
  }
  if (hash === '/login' || hash === '/signup' || hash === '/forgot') return <Auth mode={hash.slice(1)} />
  return <Landing />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
)
