import { motion } from 'framer-motion'
import { ArrowRight, Users, PhoneCall, FolderKanban, MapPin, FileText, BarChart3, Check, ShieldCheck, Cloud } from 'lucide-react'

const FEATURES = [
  [Users, 'Lead pipeline', 'Track every prospect from first contact to won deal, with stages, values and a full activity timeline.'],
  [PhoneCall, 'Follow-ups that happen', 'Schedule the next call and see who is due today, so no warm lead goes cold.'],
  [MapPin, 'Business Finder', 'Search Google Maps for businesses in any area and pull them straight into your pipeline.'],
  [FileText, 'Quotes & invoices', 'Create GST-ready quotations, convert them to invoices in one click, and download branded PDFs.'],
  [FolderKanban, 'Project tracking', 'Once a deal is won, track tasks, progress, deadlines, payments and the live URL.'],
  [BarChart3, 'Reports', 'See conversion by stage and source, revenue won and what is still in the pipeline.'],
]

const STEPS = [
  ['Find', 'Pull local businesses from Google Maps or import a CSV.'],
  ['Follow up', 'Log calls, set reminders and move leads through the stages.'],
  ['Close & deliver', 'Send a quote, invoice the client and track the build to launch.'],
]

const up = (i = 0) => ({ initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.4, delay: i * 0.06 } })

export default function Landing() {
  return (
    <div className="land">
      <header className="land-nav">
        <div className="brand" style={{ padding: 0 }}><div className="logo">E</div>EVOLV CRM</div>
        <nav className="row land-links">
          <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features').scrollIntoView({ behavior: 'smooth' }) }}>Features</a>
          <a href="#/login" className="btn ghost">Sign in</a>
          <a href="#/signup" className="btn primary">Get started</a>
        </nav>
      </header>

      <section className="hero">
        <motion.div className="hero-tag" {...up()}>Built for web design agencies</motion.div>
        <motion.h1 {...up(1)}>From cold lead to launched website, in one place.</motion.h1>
        <motion.p {...up(2)}>EVOLV CRM finds prospects, keeps your follow-ups on schedule, sends quotes and invoices, and tracks every project until it goes live.</motion.p>
        <motion.div className="row" style={{ justifyContent: 'center' }} {...up(3)}>
          <a href="#/signup" className="btn primary lg">Create free account <ArrowRight size={15} /></a>
          <a href="#/login" className="btn lg">Sign in</a>
        </motion.div>
        <motion.div className="hero-shot card" {...up(4)}>
          <div className="shot-side">{['Dashboard', 'Leads', 'Follow-ups', 'Projects', 'Finder', 'Invoices'].map((x, i) => <div key={x} className={i === 1 ? 'on' : ''}>{x}</div>)}</div>
          <div className="shot-main">
            <div className="kpis" style={{ marginBottom: 12 }}>
              {[['Leads', '128'], ['Due today', '9'], ['Won', '₹ 4,80,000'], ['Active projects', '6']].map(([l, v]) => <div key={l} className="card kpi"><div className="l">{l}</div><div className="v">{v}</div></div>)}
            </div>
            <div className="card">
              {[['Sharma Dental Clinic', 'Proposal Sent', 'c-violet'], ['Urban Bites Café', 'Interested', 'c-amber'], ['Greenleaf Interiors', 'Won', 'c-green'], ['Apex Fitness', 'Contacted', 'c-blue']].map(([n, s, c]) => (
                <div key={n} className="shot-row"><span className="name">{n}</span><span className={'badge ' + c}>{s}</span></div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="land-sec">
        <motion.h2 {...up()}>Everything your agency needs to win clients</motion.h2>
        <div className="feat-grid">
          {FEATURES.map(([Icon, t, d], i) => (
            <motion.div key={t} className="card pad feat" {...up(i)}>
              <div className="feat-ic"><Icon size={18} /></div>
              <h4>{t}</h4><p>{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="land-sec">
        <motion.h2 {...up()}>How it works</motion.h2>
        <div className="steps">
          {STEPS.map(([t, d], i) => (
            <motion.div key={t} className="stepc" {...up(i)}><span>{i + 1}</span><h4>{t}</h4><p>{d}</p></motion.div>
          ))}
        </div>
      </section>

      <section className="land-sec">
        <div className="trust card pad">
          <div><Cloud size={18} /><h4>Synced to the cloud</h4><p>Your data lives in a secure database and follows you to any device.</p></div>
          <div><ShieldCheck size={18} /><h4>Private by default</h4><p>Row-level security means only you can read or change your records.</p></div>
          <div><Check size={18} /><h4>Bring your data</h4><p>Import leads from CSV or a previous backup, and export any time.</p></div>
        </div>
      </section>

      <section className="cta card">
        <h2>Ready to grow your pipeline?</h2>
        <p>Create an account and add your first lead in under a minute.</p>
        <a href="#/signup" className="btn lg" style={{ background: 'var(--bg)', color: 'var(--text)' }}>Get started free <ArrowRight size={15} /></a>
      </section>

      <footer className="land-foot">© {new Date().getFullYear()} EVOLV · Web Design & Development</footer>
    </div>
  )
}
