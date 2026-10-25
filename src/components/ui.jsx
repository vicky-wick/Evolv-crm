import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createContext, useContext, useState, useCallback } from 'react'

export const fade = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: 'easeOut' } }

export function Page({ title, sub, actions, children }) {
  return (
    <motion.div className="page" {...fade}>
      <div className="head">
        <div>
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
        {actions && <div className="row">{actions}</div>}
      </div>
      {children}
    </motion.div>
  )
}

export function Drawer({ open, onClose, title, actions, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="drawer" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
            <div className="drawer-head">
              <h2 className="grow">{title}</h2>
              {actions}
              <button className="btn icon ghost" onClick={onClose}><X size={16} /></button>
            </div>
            <div className="drawer-body">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <div className="modal-wrap">
            <motion.div className={'modal' + (wide ? ' wide' : '')} initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }}>
              <div className="modal-head">
                <h2>{title}</h2>
                <button className="btn icon ghost" onClick={onClose}><X size={16} /></button>
              </div>
              <div className="modal-body">{children}</div>
              {footer && <div className="modal-foot">{footer}</div>}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export function Tabs({ value, onChange, options, id = 'tabs' }) {
  return (
    <div className="tabs">
      {options.map((o) => (
        <button key={o} className={'tab' + (value === o ? ' on' : '')} onClick={() => onChange(o)}>
          {value === o && <motion.div layoutId={id} className="tpill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span>{o}</span>
        </button>
      ))}
    </div>
  )
}

const stageColor = { New: 'c-blue', Contacted: 'c-violet', Interested: 'c-amber', 'Proposal Sent': 'c-amber', Won: 'c-green', Lost: 'c-red' }
const projColor = { 'Not Started': 'c-gray', 'In Progress': 'c-blue', Testing: 'c-violet', 'Ready to Deploy': 'c-amber', Deployed: 'c-green', Completed: 'c-green' }
const docColor = { Draft: 'c-gray', Sent: 'c-blue', Accepted: 'c-green', Paid: 'c-green', Rejected: 'c-red', Overdue: 'c-red' }

export const StageBadge = ({ stage }) => <span className={'badge ' + (stageColor[stage] || '')}>{stage}</span>
export const ProjectBadge = ({ status }) => <span className={'badge ' + (projColor[status] || '')}>{status}</span>
export const DocBadge = ({ status }) => <span className={'badge ' + (docColor[status] || '')}>{status}</span>

export const Bar = ({ value, green }) => (
  <div className={'bar' + (green || value === 100 ? ' green' : '')}>
    <motion.div initial={{ width: 0 }} animate={{ width: value + '%' }} transition={{ duration: 0.5, ease: 'easeOut' }} />
  </div>
)

export function Empty({ icon: Icon, text, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={28} />}
      <div>{text}</div>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  )
}

const ToastCtx = createContext(() => {})
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null)
  const show = useCallback((m) => {
    setMsg(m)
    clearTimeout(window.__toastT)
    window.__toastT = setTimeout(() => setMsg(null), 2400)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <AnimatePresence>
        {msg && (
          <motion.div className="toast" initial={{ opacity: 0, y: 12, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 12, x: '-50%' }}>
            {msg}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const ago = (d) => {
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}
