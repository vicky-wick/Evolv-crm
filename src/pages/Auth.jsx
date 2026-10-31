import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { supabase } from '../supabase.js'

const COPY = {
  login: ['Welcome back', 'Sign in to your workspace', 'Sign in'],
  signup: ['Create your account', 'Start tracking leads in minutes', 'Create account'],
  forgot: ['Reset password', "We'll email you a reset link", 'Send reset link'],
  reset: ['Choose a new password', 'Enter a new password for your account', 'Update password'],
}

export default function Auth({ mode, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  const [title, sub, cta] = COPY[mode]
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    const redirect = location.origin + location.pathname
    let res
    if (mode === 'login') res = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    else if (mode === 'signup') {
      res = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name }, emailRedirectTo: redirect } })
      if (!res.error && !res.data.session) setSent(`We sent a confirmation link to ${form.email}. Open it to activate your account.`)
    } else if (mode === 'forgot') {
      res = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: redirect })
      if (!res.error) setSent(`If an account exists for ${form.email}, a reset link is on its way.`)
    } else {
      res = await supabase.auth.updateUser({ password: form.password })
      if (!res.error) onDone()
    }
    if (res.error) setError(res.error.message)
    setBusy(false)
  }

  return (
    <div className="auth">
      <a href="#" className="auth-back"><ArrowLeft size={14} /> Home</a>
      <motion.div className="auth-card card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="brand" style={{ padding: 0, marginBottom: 22 }}><div className="logo">E</div>EVOLV CRM</div>
        {sent ? (
          <div className="auth-sent"><MailCheck size={28} /><h1>Check your inbox</h1><p>{sent}</p><a className="btn" href="#/login">Back to sign in</a></div>
        ) : (
          <>
            <h1>{title}</h1>
            <p className="auth-sub">{sub}</p>
            <form onSubmit={submit} className="auth-form">
              {mode === 'signup' && <label className="f">Full name<input className="input" required value={form.name} onChange={set('name')} autoComplete="name" /></label>}
              {mode !== 'reset' && <label className="f">Email<input className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></label>}
              {mode !== 'forgot' && (
                <label className="f">
                  <span className="row" style={{ justifyContent: 'space-between' }}>Password{mode === 'login' && <a href="#/forgot">Forgot?</a>}</span>
                  <input className="input" type="password" required minLength={6} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                </label>
              )}
              {error && <div className="auth-err">{error}</div>}
              <button className="btn primary" disabled={busy} style={{ height: 40, justifyContent: 'center' }}>{busy && <Loader2 className="spin" size={14} />}{cta}</button>
            </form>
            <div className="auth-foot">
              {mode === 'login' && <>New here? <a href="#/signup">Create an account</a></>}
              {mode === 'signup' && <>Already have an account? <a href="#/login">Sign in</a></>}
              {mode === 'forgot' && <a href="#/login">Back to sign in</a>}
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
