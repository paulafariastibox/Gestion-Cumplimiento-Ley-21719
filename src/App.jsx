import { useEffect, useMemo, useState } from 'react'
import {
  CONTROLS,
  DEMO_COMPANIES,
  DEMO_INCIDENTS,
  DEMO_USERS,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  SCOPES,
  STATUS,
  TIBOX_COLORS,
  buildDocuments,
} from './data/catalog.js'

const STORAGE = {
  companies: 'tiboxReactCompaniesV2',
  users: 'tiboxReactUsersV3',
  incidents: 'tiboxReactIncidentsV2',
  theme: 'tiboxReactThemeV2',
  session: 'tiboxReactSessionV2',
}

const clone = (value) => JSON.parse(JSON.stringify(value))

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : clone(fallback)
  } catch {
    return clone(fallback)
  }
}

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStored(key, fallback))
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value])
  return [value, setValue]
}

const initials = (name = '') => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const formatDate = (value) => value ? new Intl.DateTimeFormat('es-CL').format(new Date(`${value}T12:00:00`)) : 'Sin fecha'
const formatDateTime = (value) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Sin fecha'
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

function companyColor(company) {
  if (!company) return TIBOX_COLORS.cyan
  if (company.themeMode === 'custom' && /^#[0-9A-F]{6}$/i.test(company.themeColor ?? '')) return company.themeColor.toUpperCase()
  return TIBOX_COLORS[company.themeMode] ?? TIBOX_COLORS.cyan
}

function colorInk(hex) {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#05243A' : '#FFFFFF'
}

function progressFor(company, scopeId = null) {
  const controls = scopeId ? CONTROLS.filter((control) => control.scopeId === scopeId) : CONTROLS
  let total = 0
  let score = 0
  controls.forEach((control) => {
    const weight = STATUS[company.documents[control.id]?.status ?? 'pending'].weight
    if (weight !== null) {
      total += 1
      score += weight
    }
  })
  return total ? Math.round((score / total) * 100) : 100
}

function countsFor(company, scopeId = null) {
  const controls = scopeId ? CONTROLS.filter((control) => control.scopeId === scopeId) : CONTROLS
  return controls.reduce((counts, control) => {
    const item = company.documents[control.id] ?? { status: 'pending', evidences: [] }
    counts[item.status] += 1
    counts.evidences += item.evidences?.length ?? 0
    return counts
  }, { completed: 0, progressing: 0, pending: 0, na: 0, evidences: 0 })
}

function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-2" aria-label="TIBOX">
      <span className={`${compact ? 'text-lg' : 'text-xl'} font-black tracking-[.28em] text-white`}>TIBOX</span>
      <span className="relative h-4 w-4 rotate-30 rounded-[3px] bg-tibox-cyan before:absolute before:right-0 before:top-0 before:h-2 before:w-2 before:bg-tibox-yellow after:absolute after:bottom-0 after:right-0 after:h-2 after:w-2 after:bg-tibox-orange" />
    </div>
  )
}

function CompanyLogo({ company, large = false }) {
  const size = large ? 'h-18 w-24' : 'h-14 w-18'
  if (company.logoData) return <div className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2`}><img className="h-full w-full object-contain" src={company.logoData} alt={`Logo ${company.name}`} /></div>
  if (company.id === 'tibox') return <div className={`${size} grid shrink-0 place-items-center rounded-xl border border-slate-200 bg-white px-2`}><span className="text-sm font-black tracking-[.22em] text-slate-900">TIBOX</span></div>
  return <div className={`${size} grid shrink-0 place-items-center rounded-xl border border-slate-200 bg-white font-black text-slate-800`}>{company.initials || initials(company.name)}</div>
}

function NavIcon({ type }) {
  const paths = {
    companies: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    incidents: <><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    users: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
  }
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>
}

function StatusBadge({ status }) {
  const styles = {
    completed: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
    progressing: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    pending: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
    na: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
  }
  return <span className={`badge ${styles[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{STATUS[status]?.label ?? 'No iniciado'}</span>
}

function SeverityBadge({ severity }) {
  const styles = {
    low: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
    medium: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    high: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300',
    critical: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300',
  }
  return <span className={`badge ${styles[severity]}`}>{INCIDENT_SEVERITY[severity]}</span>
}

function ProgressBar({ value }) {
  return <div className="progress-track"><div className="progress-value" style={{ width: `${value}%` }} /></div>
}

function StatCard({ label, value, detail, color = 'var(--tenant)' }) {
  return <article className="stat-card" style={{ '--stat-color': color }}><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span><strong className="mt-1 block text-2xl text-slate-900 dark:text-white">{value}</strong><small className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">{detail}</small></article>
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className={`modal-panel ${wide ? 'max-w-5xl' : ''}`}><header className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}</div><button className="btn h-9 min-h-9 w-9 px-0" onClick={onClose} aria-label="Cerrar">×</button></header>{children}</section></div>
}

function Field({ label, children, full = false }) {
  return <label className={full ? 'sm:col-span-2' : ''}><span className="label">{label}</span>{children}</label>
}

function LoginScreen({ users, onLogin }) {
  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_78%_15%,rgba(0,209,255,.13),transparent_28%),radial-gradient(circle_at_18%_85%,rgba(0,38,187,.22),transparent_34%),#07101c] p-4 text-white"><section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl lg:grid-cols-[1.05fr_.95fr]"><div className="hidden bg-[linear-gradient(145deg,rgba(14,156,220,.13),transparent_55%),#0b1626] p-10 lg:block"><BrandMark /><h1 className="mt-16 max-w-md text-4xl font-bold leading-tight">Cumplimiento de Protección de Datos</h1><p className="mt-4 max-w-md text-slate-400">Gestión de controles, evidencias e incidentes asociados a la Ley N° 21.719.</p><div className="mt-9 grid gap-3 text-sm text-slate-300">{['Acceso segmentado por empresa', 'Permisos de visualización y edición', 'Trazabilidad por ámbito e incidente'].map((text) => <span key={text} className="flex items-center gap-2"><i className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/10 not-italic text-emerald-300">✓</i>{text}</span>)}</div></div><div className="p-7 sm:p-10"><div className="eyebrow">Portal de demostración</div><h2 className="mt-2 text-2xl font-bold">Selecciona un perfil</h2><p className="mt-1 text-sm text-slate-400">Explora el prototipo según el tipo de usuario y nivel de permiso.</p><div className="mt-7 grid gap-3">{users.map((user) => <button key={user.id} type="button" onClick={() => onLogin(user.id)} className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-400/5"><span className="block text-sm font-semibold text-white">{user.type === 'tibox' ? 'TIBOX' : 'Cliente'} · {user.permission === 'editor' ? 'Editor' : 'Visualizador'}</span><span className="mt-1 block text-xs text-slate-400">{user.firstName} {user.lastName} · {user.jobTitle}</span></button>)}</div><div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] leading-relaxed text-amber-100">Este es un prototipo sin autenticación real. El acceso con correo y clave debe implementarse en un backend seguro antes de usarlo con clientes.</div><p className="mt-3 text-[11px] text-slate-500">Los datos de prueba se almacenan localmente en este navegador.</p></div></section></main>
}

function Header({ user, view, onNavigate, onLogout, theme, onTheme }) {
  const isMaintainer = user.type === 'tibox' && user.permission === 'editor'
  const nav = [{ id: 'companies', label: user.type === 'client' ? 'Mi empresa' : 'Empresas', icon: 'companies' }, { id: 'incidents', label: 'Incidentes', icon: 'incidents' }, ...(isMaintainer ? [{ id: 'users', label: 'Usuarios', icon: 'users' }] : [])]
  return <header className="sticky top-0 z-50 border-b border-slate-700 bg-[linear-gradient(105deg,#07101c_0%,#0b1626_58%,#0d2942_100%)] text-white shadow-lg"><div className="mx-auto flex min-h-[76px] max-w-[1600px] flex-wrap items-center gap-4 px-4 sm:px-7"><div className="flex items-center gap-3 pr-4"><BrandMark compact /><span className="hidden border-l border-slate-600 pl-3 text-xs font-semibold sm:block">Cumplimiento<small className="block font-normal text-slate-400">Ley N° 21.719</small></span></div><nav className="order-3 flex w-full gap-1 overflow-x-auto pb-2 sm:order-none sm:w-auto sm:pb-0">{nav.map((item) => <button key={item.id} onClick={() => onNavigate(item.id)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${view === item.id || (view === 'company' && item.id === 'companies') ? 'border border-cyan-400/25 bg-cyan-400/15 text-white shadow-[inset_0_-2px_0_#00d1ff]' : 'text-slate-300 hover:bg-cyan-400/10 hover:text-white'}`}><NavIcon type={item.icon} />{item.label}</button>)}</nav><div className="ml-auto flex items-center gap-2"><button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-700 bg-white/5 text-slate-300 hover:bg-cyan-400/10 hover:text-white" onClick={onTheme} title={theme === 'light' ? 'Vista oscura' : 'Vista clara'}>{theme === 'light' ? '☾' : '☀'}</button><div className="hidden border-l border-slate-700 pl-3 md:block"><strong className="block text-xs">{user.firstName} {user.lastName}</strong><small className="block text-[10px] text-slate-400">{user.permission === 'editor' ? 'Editor' : 'Visualizador'}</small></div><button className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white" onClick={onLogout} title="Cerrar sesión">↪</button></div></div><div className="h-[3px] bg-[linear-gradient(90deg,#0026bb_0_62%,#ff4222_62%_82%,#ffb200_82%)]" /></header>
}

function PageTitle({ eyebrow, title, subtitle, actions }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="eyebrow">{eyebrow}</div><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1><p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p></div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>
}

function CompaniesView({ companies, user, incidents, onOpen, onNew }) {
  const [query, setQuery] = useState('')
  const filtered = companies.filter((company) => `${company.name} ${company.industry}`.toLowerCase().includes(query.toLowerCase()))
  const total = companies.reduce((acc, company) => { const counts = countsFor(company); acc.completed += counts.completed; acc.evidences += counts.evidences; return acc }, { completed: 0, evidences: 0 })
  const average = companies.length ? Math.round(companies.reduce((sum, company) => sum + progressFor(company), 0) / companies.length) : 0
  return <><PageTitle eyebrow="Ley N° 21.719" title={user.type === 'client' ? 'Mis empresas' : 'Empresas'} subtitle={user.type === 'client' ? 'Consulta el cumplimiento de las empresas asociadas a tu cuenta.' : 'Gestiona el avance documental y las evidencias de cada organización.'} actions={<><label className="relative"><span className="absolute left-3 top-2.5 text-slate-400">⌕</span><input className="input min-w-64 pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa o rubro" /></label>{user.type === 'tibox' && user.permission === 'editor' && <button className="btn btn-primary" onClick={onNew}>＋ Nueva empresa</button>}</>} /><section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Empresas visibles" value={companies.length} detail="Organizaciones disponibles" /><StatCard label="Avance promedio" value={`${average}%`} detail="Promedio de cumplimiento" color="#00BCEB" /><StatCard label="Controles completados" value={total.completed} detail={`de ${companies.length * CONTROLS.length} registros`} color="#10B981" /><StatCard label="Incidentes registrados" value={incidents.length} detail="Casos de empresas visibles" color="#FF5A26" /></section><section className="grid gap-3">{filtered.map((company) => { const progress = progressFor(company); const counts = countsFor(company); return <button key={company.id} onClick={() => onOpen(company.id)} className="card group relative grid min-h-24 w-full grid-cols-[72px_minmax(0,1fr)_28px] items-center gap-4 overflow-hidden p-4 text-left transition hover:-translate-y-px hover:tenant-border md:grid-cols-[78px_minmax(180px,1.1fr)_minmax(150px,.7fr)_minmax(210px,1fr)_150px_28px]" style={{ '--company': companyColor(company) }}><span className="absolute inset-y-0 left-0 w-1 bg-[var(--company)]" /><CompanyLogo company={company} /><span><strong className="block text-base text-slate-950 dark:text-white">{company.name}</strong><small className="text-xs text-slate-500 dark:text-slate-400">{company.taxId}</small></span><span className="hidden md:block"><small className="block text-[11px] text-slate-400">Rubro</small><strong className="text-sm text-slate-700 dark:text-slate-200">{company.industry}</strong></span><span className="col-start-2 md:col-auto"><span className="mb-2 flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Avance general</span><strong className="text-slate-900 dark:text-white">{progress}%</strong></span><ProgressBar value={progress} /></span><span className="hidden text-xs text-slate-500 md:block"><strong className="block text-sm text-slate-900 dark:text-white">{counts.completed} de {CONTROLS.length}</strong>controles completados</span><span className="col-start-3 row-start-1 text-xl text-slate-400 md:col-auto">›</span></button> })}{!filtered.length && <div className="card p-8 text-center text-sm text-slate-500">No se encontraron empresas.</div>}</section></>
}

function ControlsPanel({ company, onOpenControl }) {
  const [query, setQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const totalProgress = progressFor(company)
  const totalCounts = countsFor(company)
  const groups = SCOPES.map((scope) => ({
    scope,
    controls: CONTROLS.filter((control) => control.scopeId === scope.id).filter((control) => {
      const item = company.documents[control.id] ?? { status: 'pending' }
      return `${control.name} ${scope.name}`.toLowerCase().includes(query.toLowerCase()) && (scopeFilter === 'all' || scope.id === scopeFilter) && (statusFilter === 'all' || item.status === statusFilter)
    }),
  })).filter((group) => group.controls.length)
  return <section><div className="mb-3"><h2 className="text-lg font-bold text-slate-950 dark:text-white">Controles de cumplimiento</h2><p className="text-xs text-slate-500 dark:text-slate-400">Documentos y evidencias agrupados por ámbito.</p></div><div className="card tenant-border mb-3 grid gap-4 bg-[linear-gradient(110deg,rgba(var(--tenant-rgb),.12),transparent_64%)] p-4 md:grid-cols-[minmax(170px,.55fr)_minmax(260px,1fr)] md:items-center"><div><span className="text-xs text-slate-500 dark:text-slate-400">Avance global de la empresa</span><strong className="block text-2xl text-slate-950 dark:text-white">{totalProgress}%</strong></div><div><div className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500 dark:text-slate-400"><span>{totalCounts.completed} completados · {totalCounts.progressing} en proceso · {totalCounts.pending} no iniciados</span><strong className="text-slate-900 dark:text-white">{totalCounts.completed} de {CONTROLS.length}</strong></div><ProgressBar value={totalProgress} /></div></div><div className="mb-3 grid gap-2 lg:grid-cols-[1fr_260px_190px]"><label className="relative"><span className="absolute left-3 top-2.5 text-slate-400">⌕</span><input className="input pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar control o ámbito" /></label><select className="input" value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value)}><option value="all">Todos los ámbitos</option>{SCOPES.map((scope) => <option key={scope.id} value={scope.id}>{scope.name}</option>)}</select><select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option>{Object.entries(STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></div><div className="grid gap-3">{groups.map(({ scope, controls }) => { const progress = progressFor(company, scope.id); const counts = countsFor(company, scope.id); return <details key={scope.id} className="scope-details card overflow-hidden" open><summary className="grid cursor-pointer grid-cols-[42px_minmax(0,1fr)_60px_18px] items-center gap-3 bg-[linear-gradient(90deg,rgba(var(--tenant-rgb),.08),transparent_60%)] p-4 hover:bg-[rgba(var(--tenant-rgb),.1)] md:grid-cols-[42px_minmax(0,1fr)_minmax(210px,.55fr)_72px_20px]"><span className="tenant-soft grid h-10 w-10 place-items-center rounded-xl text-lg text-[var(--tenant)]">{scope.icon}</span><span><strong className="block text-sm text-slate-950 dark:text-white">{scope.name}</strong><small className="text-[11px] text-slate-500 dark:text-slate-400">{scope.controls.length} controles · {counts.completed} completados · {counts.progressing} en proceso</small></span><span className="col-start-2 col-end-5 row-start-2 md:col-auto md:row-auto"><span className="mb-1.5 flex justify-between text-[11px] text-slate-500 dark:text-slate-400"><span>Avance del ámbito</span><strong className="text-slate-800 dark:text-white">{counts.completed} de {scope.controls.length}</strong></span><ProgressBar value={progress} /></span><strong className="col-start-3 row-start-1 text-right text-base text-[var(--tenant)] md:col-auto md:row-auto">{progress}%</strong><span className="scope-chevron col-start-4 row-start-1 text-slate-400 transition md:col-auto md:row-auto">›</span></summary><div className="grid gap-2 border-t border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/40">{controls.map((control) => { const item = company.documents[control.id] ?? { status: 'pending', evidences: [] }; return <button key={control.id} className="grid w-full grid-cols-[38px_minmax(0,1fr)_28px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:tenant-border dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[38px_minmax(0,1fr)_125px_125px_90px_28px]" onClick={() => onOpenControl(control.id)}><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-[var(--tenant)] dark:bg-slate-800">▤</span><span><strong className="block text-sm text-slate-950 dark:text-white">{control.name}</strong><small className="text-[11px] text-slate-500 dark:text-slate-400">{item.dueDate ? `Fecha objetivo ${formatDate(item.dueDate)} · ` : ''}{item.evidences?.length ?? 0} evidencias</small></span><span className="col-start-2 md:col-auto"><StatusBadge status={item.status} /></span><span className="hidden text-xs text-slate-500 md:block">{item.owner || 'Sin responsable'}</span><span className="col-start-2 text-xs text-slate-500 md:col-auto">{item.evidences?.length ?? 0} respaldos</span><span className="col-start-3 row-start-1 text-slate-400 md:col-auto md:row-auto">›</span></button> })}</div></details> })}{!groups.length && <div className="card p-8 text-center text-sm text-slate-500">No hay controles que coincidan con los filtros.</div>}</div></section>
}

function IncidentRow({ incident, companies, onOpen, showCompany = true }) {
  const company = companies.find((item) => item.id === incident.companyId)
  return <button onClick={() => onOpen(incident.id)} className={`card grid w-full items-center gap-3 p-3 text-left transition hover:tenant-border ${showCompany ? 'grid-cols-[minmax(0,1fr)_100px_28px] md:grid-cols-[110px_minmax(0,1.4fr)_minmax(130px,.7fr)_100px_120px_28px]' : 'grid-cols-[minmax(0,1fr)_100px_28px] md:grid-cols-[110px_minmax(0,1.4fr)_100px_120px_28px]'}`}><span className="hidden text-xs text-slate-500 md:block">{formatDateTime(incident.detectedAt)}</span><span><strong className="block text-sm text-slate-950 dark:text-white">{incident.title}</strong><small className="text-[11px] text-slate-500 dark:text-slate-400">{incident.affectedPeople || 0} personas aprox. · {incident.evidences?.length ?? 0} evidencias</small></span>{showCompany && <span className="hidden text-xs text-slate-500 md:block">{company?.name}</span>}<SeverityBadge severity={incident.severity} /><span className="hidden text-xs text-slate-500 md:block">{INCIDENT_STATUS[incident.status]}</span><span className="text-slate-400">›</span></button>
}

function CompanyView({ company, incidents, user, onBack, onOpenControl, onOpenIncident, onNewIncident, onBranding }) {
  const [tab, setTab] = useState('controls')
  const progress = progressFor(company)
  const counts = countsFor(company)
  const companyIncidents = incidents.filter((incident) => incident.companyId === company.id)
  const isMaintainer = user.type === 'tibox' && user.permission === 'editor'
  return <><button className="mb-4 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" onClick={onBack}>← Volver a empresas</button><section className="card tenant-border relative mb-4 grid gap-4 overflow-hidden p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"><span className="absolute inset-y-0 left-0 w-1 bg-[var(--tenant)]" /><CompanyLogo company={company} large /><div><div className="eyebrow">{company.taxId}</div><h1 className="text-2xl font-bold text-slate-950 dark:text-white">{company.name}</h1><p className="text-sm text-slate-500 dark:text-slate-400">{company.industry} · Responsable: {company.owner || 'Sin asignar'}</p></div><div className="flex items-center gap-4"><div className="relative grid h-20 w-20 place-items-center rounded-full" style={{ background: `conic-gradient(var(--tenant) ${progress}%, #e2e8f0 0)` }}><span className="absolute inset-2 rounded-full bg-white dark:bg-slate-900" /><strong className="relative text-lg">{progress}%</strong></div><span><small className="block text-xs text-slate-500">Avance global</small><strong className="text-sm">{counts.completed} de {CONTROLS.length} completados</strong></span></div>{isMaintainer && <button className="btn absolute right-3 top-3 h-9 min-h-9 w-9 px-0 text-[var(--tenant)]" onClick={onBranding} title="Personalizar empresa">✎</button>}</section><section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Completados" value={counts.completed} detail="Controles finalizados" color="#10B981" /><StatCard label="En proceso" value={counts.progressing} detail="Actualmente en elaboración" color="#F59E0B" /><StatCard label="No iniciados" value={counts.pending} detail="Pendientes de abordar" color="#94A3B8" /><StatCard label="Incidentes" value={companyIncidents.length} detail="Casos asociados" color="#FF5A26" /></section><div className="card mb-5 flex gap-1 overflow-x-auto p-1.5"><button className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === 'controls' ? 'tenant-soft text-slate-950 dark:text-white' : 'text-slate-500'}`} onClick={() => setTab('controls')}>Controles <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">{CONTROLS.length}</span></button><button className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === 'incidents' ? 'tenant-soft text-slate-950 dark:text-white' : 'text-slate-500'}`} onClick={() => setTab('incidents')}>Incidentes <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">{companyIncidents.length}</span></button></div>{tab === 'controls' ? <ControlsPanel company={company} onOpenControl={onOpenControl} /> : <section><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Incidentes asociados</h2><p className="text-xs text-slate-500">Vulneraciones registradas para esta empresa.</p></div>{user.permission === 'editor' && <button className="btn btn-primary" onClick={onNewIncident}>＋ Nuevo incidente</button>}</div><div className="grid gap-2">{companyIncidents.map((incident) => <IncidentRow key={incident.id} incident={incident} companies={[company]} onOpen={onOpenIncident} showCompany={false} />)}{!companyIncidents.length && <div className="card p-8 text-center text-sm text-slate-500">Esta empresa todavía no tiene incidentes registrados.</div>}</div></section>}</>
}

function IncidentsView({ incidents, companies, canEdit, onOpen, onNew }) {
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const scoped = incidents.filter((incident) => companyFilter === 'all' || incident.companyId === companyFilter)
  const filtered = scoped.filter((incident) => `${incident.title} ${incident.description} ${incident.owner}`.toLowerCase().includes(query.toLowerCase()) && (statusFilter === 'all' || incident.status === statusFilter))
  const active = scoped.filter((incident) => incident.status !== 'closed').length
  const high = scoped.filter((incident) => ['high', 'critical'].includes(incident.severity)).length
  const evidences = scoped.reduce((total, incident) => total + (incident.evidences?.length ?? 0), 0)
  return <><PageTitle eyebrow="Ley N° 21.719 · Trazabilidad" title="Registro de incidentes" subtitle="Documenta vulneraciones, impacto, medidas, responsables, comunicaciones y evidencias." actions={canEdit && <button className="btn btn-primary" onClick={onNew}>＋ Nuevo incidente</button>} /><section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Incidentes registrados" value={scoped.length} detail="Historial disponible" /><StatCard label="Casos activos" value={active} detail="Abiertos, investigados o contenidos" color="#F59E0B" /><StatCard label="Riesgo alto o crítico" value={high} detail="Priorización requerida" color="#EF4444" /><StatCard label="Evidencias" value={evidences} detail="Respaldos asociados" color="#00BCEB" /></section><div className="mb-3 grid gap-2 lg:grid-cols-[1fr_260px_190px]"><label className="relative"><span className="absolute left-3 top-2.5 text-slate-400">⌕</span><input className="input pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar incidente o responsable" /></label><select className="input" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}><option value="all">Todas las empresas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option>{Object.entries(INCIDENT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="grid gap-2">{filtered.map((incident) => <IncidentRow key={incident.id} incident={incident} companies={companies} onOpen={onOpen} />)}{!filtered.length && <div className="card p-8 text-center text-sm text-slate-500">No hay incidentes que coincidan con los filtros.</div>}</div></>
}

function UsersView({ users, companies, onOpen, onNew }) {
  const [query, setQuery] = useState('')
  const filtered = users.filter((user) => `${user.firstName} ${user.lastName} ${user.email} ${user.jobTitle}`.toLowerCase().includes(query.toLowerCase()))
  const editors = users.filter((user) => user.permission === 'editor').length
  return <><PageTitle eyebrow="Administración de acceso" title="Usuarios" subtitle="Asigna acceso TIBOX o cliente, empresas asociadas y permisos individuales." actions={<><label className="relative"><span className="absolute left-3 top-2.5 text-slate-400">⌕</span><input className="input min-w-64 pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario" /></label><button className="btn btn-primary" onClick={onNew}>＋ Nuevo usuario</button></>} /><section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Usuarios activos" value={users.length} detail="Accesos configurados" /><StatCard label="Usuarios TIBOX" value={users.filter((user) => user.type === 'tibox').length} detail="Acceso global" color="#00BCEB" /><StatCard label="Usuarios cliente" value={users.filter((user) => user.type === 'client').length} detail="Acceso segmentado" color="#F59E0B" /><StatCard label="Editores / visualizadores" value={`${editors} / ${users.length - editors}`} detail="Niveles de permiso" color="#10B981" /></section><div className="grid gap-2">{filtered.map((user) => <button key={user.id} onClick={() => onOpen(user.id)} className="card grid w-full grid-cols-[42px_minmax(0,1fr)_100px_28px] items-center gap-3 p-3 text-left md:grid-cols-[42px_minmax(0,1fr)_110px_minmax(160px,.8fr)_110px_28px]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--tenant)] text-xs font-bold text-[var(--tenant-ink)]">{initials(`${user.firstName} ${user.lastName}`)}</span><span><strong className="block text-sm text-slate-950 dark:text-white">{user.firstName} {user.lastName}</strong><small className="text-xs text-slate-500">{user.email} · {user.jobTitle || 'Sin cargo'}</small></span><span className="hidden text-xs text-slate-500 md:block">{user.type === 'tibox' ? 'TIBOX' : 'Cliente'}</span><span className="hidden truncate text-xs text-slate-500 md:block">{user.type === 'tibox' ? 'Todas las empresas' : user.companyIds.map((id) => companies.find((company) => company.id === id)?.name).filter(Boolean).join(', ')}</span><span className={`badge ${user.permission === 'editor' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-sky-50 text-sky-600 dark:bg-sky-950/40'}`}>{user.permission === 'editor' ? 'Editor' : 'Visualizador'}</span><span className="text-slate-400">›</span></button>)}</div></>
}

function EvidenceEditor({ evidences, setEvidences, disabled }) {
  const [url, setUrl] = useState('')
  const addFile = (event) => { const file = event.target.files?.[0]; if (file) setEvidences([...evidences, { id: uid('ev'), name: file.name, url: '', date: new Date().toISOString().slice(0, 10) }]); event.target.value = '' }
  const addUrl = () => { if (!url.trim()) return; try { const parsed = new URL(url); setEvidences([...evidences, { id: uid('ev'), name: parsed.hostname, url, date: new Date().toISOString().slice(0, 10) }]); setUrl('') } catch { /* URL no válida */ } }
  return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40"><h3 className="text-sm font-bold">Evidencias adjuntas</h3><div className="mt-3 grid gap-2">{evidences.map((evidence, index) => <div key={evidence.id ?? index} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"><span className="tenant-soft grid h-8 w-8 place-items-center rounded-lg text-[var(--tenant)]">↗</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{evidence.name}</strong><small className="text-[10px] text-slate-500">{evidence.url ? 'Enlace externo' : 'Archivo de referencia'} · {formatDate(evidence.date)}</small></span>{!disabled && <button type="button" className="text-xs text-red-500" onClick={() => setEvidences(evidences.filter((_, itemIndex) => itemIndex !== index))}>Quitar</button>}</div>)}{!evidences.length && <p className="text-xs text-slate-500">Aún no hay evidencias asociadas.</p>}</div>{!disabled && <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input className="input" type="file" onChange={addFile} /><input className="input" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /><button type="button" className="btn" onClick={addUrl}>Agregar enlace</button></div>}</section>
}

function DocumentModal({ company, control, readOnly, onClose, onSave }) {
  const original = company.documents[control.id] ?? { status: 'pending', owner: '', dueDate: '', reviewedAt: '', notes: '', evidences: [] }
  const [form, setForm] = useState(() => clone(original))
  const scope = SCOPES.find((item) => item.id === control.scopeId)
  return <Modal title={control.name} subtitle={`${scope.name} · ${company.name}`} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(form) }}><fieldset disabled={readOnly} className="grid gap-3 sm:grid-cols-2"><Field label="Estado"><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{Object.entries(STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></Field><Field label="Responsable"><input className="input" value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></Field><Field label="Fecha objetivo"><input className="input" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field><Field label="Última revisión"><input className="input" type="date" value={form.reviewedAt} onChange={(event) => setForm({ ...form, reviewedAt: event.target.value })} /></Field><Field label="Notas" full><textarea className="input min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></fieldset>{readOnly && <p className="my-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">Modo de solo lectura: tu usuario puede consultar, pero no modificar.</p>}<div className="mt-4"><EvidenceEditor evidences={form.evidences ?? []} setEvidences={(evidences) => setForm({ ...form, evidences })} disabled={readOnly} /></div><div className="mt-5 flex justify-end gap-2"><button type="button" className="btn" onClick={onClose}>Cerrar</button>{!readOnly && <button className="btn btn-primary" type="submit">Guardar cambios</button>}</div></form></Modal>
}

function IncidentModal({ incident, companies, readOnly, preferredCompanyId, onClose, onSave }) {
  const now = new Date().toISOString().slice(0, 16)
  const [form, setForm] = useState(() => clone(incident ?? { id: '', companyId: preferredCompanyId || companies[0]?.id || '', title: '', incidentDate: now, detectedAt: now, description: '', systems: '', dataCategories: '', affectedPeople: 0, severity: 'medium', impact: '', containment: '', correctiveActions: '', agencyNotification: 'evaluating', agencyNotificationDate: '', holderCommunication: 'evaluating', holderCommunicationDate: '', communications: '', owner: '', status: 'open', evidences: [], updatedAt: now }))
  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value })
  return <Modal title={incident ? 'Editar incidente' : 'Nuevo incidente'} subtitle="Registro y gestión de vulneraciones de seguridad." onClose={onClose} wide><form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, affectedPeople: Number(form.affectedPeople), id: form.id || uid('inc'), updatedAt: new Date().toISOString() }) }}><fieldset disabled={readOnly} className="grid gap-3 sm:grid-cols-2"><Field label="Empresa"><select className="input" value={form.companyId} onChange={change('companyId')}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></Field><Field label="Estado"><select className="input" value={form.status} onChange={change('status')}>{Object.entries(INCIDENT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Título" full><input className="input" required value={form.title} onChange={change('title')} /></Field><Field label="Fecha del incidente"><input className="input" type="datetime-local" required value={form.incidentDate} onChange={change('incidentDate')} /></Field><Field label="Fecha de detección"><input className="input" type="datetime-local" required value={form.detectedAt} onChange={change('detectedAt')} /></Field><Field label="Descripción" full><textarea className="input min-h-24" required value={form.description} onChange={change('description')} /></Field><Field label="Sistemas o procesos afectados"><input className="input" value={form.systems} onChange={change('systems')} /></Field><Field label="Categorías de datos"><input className="input" value={form.dataCategories} onChange={change('dataCategories')} /></Field><Field label="Personas afectadas"><input className="input" min="0" type="number" value={form.affectedPeople} onChange={change('affectedPeople')} /></Field><Field label="Impacto o riesgo"><select className="input" value={form.severity} onChange={change('severity')}>{Object.entries(INCIDENT_SEVERITY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Impacto observado" full><textarea className="input" value={form.impact} onChange={change('impact')} /></Field><Field label="Medidas de contención" full><textarea className="input" value={form.containment} onChange={change('containment')} /></Field><Field label="Acciones correctivas" full><textarea className="input" value={form.correctiveActions} onChange={change('correctiveActions')} /></Field><Field label="Notificación a la Agencia"><select className="input" value={form.agencyNotification} onChange={change('agencyNotification')}><option value="evaluating">En evaluación</option><option value="yes">Sí</option><option value="no">No</option></select></Field><Field label="Fecha de notificación"><input className="input" type="datetime-local" value={form.agencyNotificationDate} onChange={change('agencyNotificationDate')} /></Field><Field label="Comunicación a titulares"><select className="input" value={form.holderCommunication} onChange={change('holderCommunication')}><option value="evaluating">En evaluación</option><option value="yes">Sí</option><option value="no">No</option></select></Field><Field label="Fecha de comunicación"><input className="input" type="datetime-local" value={form.holderCommunicationDate} onChange={change('holderCommunicationDate')} /></Field><Field label="Responsable interno"><input className="input" value={form.owner} onChange={change('owner')} /></Field><Field label="Comunicaciones realizadas"><input className="input" value={form.communications} onChange={change('communications')} /></Field></fieldset>{readOnly && <p className="my-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">Modo de solo lectura.</p>}<div className="mt-4"><EvidenceEditor evidences={form.evidences ?? []} setEvidences={(evidences) => setForm({ ...form, evidences })} disabled={readOnly} /></div><div className="mt-5 flex justify-end gap-2"><button className="btn" type="button" onClick={onClose}>Cerrar</button>{!readOnly && <button className="btn btn-primary" type="submit">Guardar incidente</button>}</div></form></Modal>
}

function UserModal({ user, companies, onClose, onSave }) {
  const [form, setForm] = useState(() => user ? clone(user) : { id: '', firstName: '', lastName: '', email: '', jobTitle: '', type: 'client', permission: 'viewer', companyIds: [] })
  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value })
  const toggleCompany = (id) => setForm({ ...form, companyIds: form.companyIds.includes(id) ? form.companyIds.filter((item) => item !== id) : [...form.companyIds, id] })
  return <Modal title={user ? 'Editar usuario' : 'Nuevo usuario'} subtitle="Identidad, acceso, empresas y nivel de permiso." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave({ ...form, id: form.id || uid('usr'), companyIds: form.type === 'tibox' ? [] : form.companyIds }) }}><div className="grid gap-3 sm:grid-cols-2"><Field label="Nombre"><input className="input" required value={form.firstName} onChange={change('firstName')} /></Field><Field label="Apellido"><input className="input" required value={form.lastName} onChange={change('lastName')} /></Field><Field label="Correo"><input className="input" type="email" required value={form.email} onChange={change('email')} /></Field><Field label="Cargo"><input className="input" value={form.jobTitle} onChange={change('jobTitle')} /></Field><Field label="Tipo de acceso"><select className="input" value={form.type} onChange={change('type')}><option value="tibox">TIBOX</option><option value="client">Cliente</option></select></Field><Field label="Nivel de permiso"><select className="input" value={form.permission} onChange={change('permission')}><option value="viewer">Solo visualizar</option><option value="editor">Editar y adjuntar</option></select></Field>{form.type === 'client' && <Field label="Empresas asociadas" full><div className="grid gap-2 sm:grid-cols-2">{companies.map((company) => <label key={company.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><input type="checkbox" checked={form.companyIds.includes(company.id)} onChange={() => toggleCompany(company.id)} />{company.name}</label>)}</div></Field>}<Field label="Autenticación" full><p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">La gestión de claves se habilitará al conectar el backend de autenticación. El prototipo no almacena contraseñas.</p></Field></div><div className="mt-5 flex justify-end gap-2"><button className="btn" type="button" onClick={onClose}>Cancelar</button><button className="btn btn-primary" type="submit">Guardar usuario</button></div></form></Modal>
}

function CompanyModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', industry: '', taxId: '', owner: '' })
  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value })
  return <Modal title="Nueva empresa" subtitle="Se creará con los 41 controles del catálogo." onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); const base = { ...form, id: uid('company'), initials: initials(form.name), seed: [0, 0, 0], themeMode: 'cyan', themeColor: TIBOX_COLORS.cyan, logoData: '' }; onSave({ ...base, documents: buildDocuments(base) }) }}><div className="grid gap-3 sm:grid-cols-2"><Field label="Nombre"><input className="input" required value={form.name} onChange={change('name')} /></Field><Field label="Rubro"><input className="input" required value={form.industry} onChange={change('industry')} /></Field><Field label="RUT"><input className="input" value={form.taxId} onChange={change('taxId')} /></Field><Field label="Responsable"><input className="input" value={form.owner} onChange={change('owner')} /></Field></div><div className="mt-5 flex justify-end gap-2"><button className="btn" type="button" onClick={onClose}>Cancelar</button><button className="btn btn-primary" type="submit">Crear empresa</button></div></form></Modal>
}

function BrandingModal({ company, onClose, onSave }) {
  const [form, setForm] = useState(() => ({ themeMode: company.themeMode ?? 'cyan', themeColor: company.themeColor ?? TIBOX_COLORS.cyan, logoData: company.logoData ?? '' }))
  const selectedColor = form.themeMode === 'custom' ? form.themeColor : TIBOX_COLORS[form.themeMode]
  const loadLogo = (event) => { const file = event.target.files?.[0]; if (!file || file.size > 2 * 1024 * 1024) return; const reader = new FileReader(); reader.onload = () => setForm({ ...form, logoData: reader.result }); reader.readAsDataURL(file) }
  return <Modal title="Personalizar empresa" subtitle="Logo e identidad visual del portal del cliente." onClose={onClose}><div className="mb-5 flex items-center gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700" style={{ background: `${selectedColor}14` }}><CompanyLogo company={{ ...company, logoData: form.logoData }} large /><div><strong className="block text-lg">{company.name}</strong><small className="text-slate-500">Vista previa · {selectedColor}</small></div><span className="ml-auto h-10 w-10 rounded-full border-4 border-white shadow" style={{ background: selectedColor }} /></div><div className="grid gap-4"><Field label="Identidad de color"><select className="input" value={form.themeMode} onChange={(event) => setForm({ ...form, themeMode: event.target.value, themeColor: TIBOX_COLORS[event.target.value] ?? form.themeColor })}><option value="cyan">Celeste TIBOX (estándar)</option><option value="orange">Naranjo TIBOX</option><option value="yellow">Amarillo TIBOX</option><option value="custom">Color personalizado</option></select></Field>{form.themeMode === 'custom' && <Field label="Color HEX"><div className="grid grid-cols-[64px_1fr] gap-2"><input className="input p-1" type="color" value={form.themeColor} onChange={(event) => setForm({ ...form, themeColor: event.target.value.toUpperCase() })} /><input className="input" pattern="#[0-9A-Fa-f]{6}" value={form.themeColor} onChange={(event) => setForm({ ...form, themeColor: event.target.value.toUpperCase() })} /></div></Field>}<Field label="Logo de la empresa"><input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={loadLogo} /><small className="mt-1 block text-[10px] text-slate-500">PNG, JPG o WebP de hasta 2 MB.</small></Field></div><div className="mt-5 flex justify-end gap-2"><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => onSave(form)}>Guardar personalización</button></div></Modal>
}

export default function App() {
  const [companies, setCompanies] = useStoredState(STORAGE.companies, DEMO_COMPANIES)
  const [users, setUsers] = useStoredState(STORAGE.users, DEMO_USERS)
  const [incidents, setIncidents] = useStoredState(STORAGE.incidents, DEMO_INCIDENTS)
  const [theme, setTheme] = useStoredState(STORAGE.theme, 'light')
  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem(STORAGE.session) ?? '')
  const [view, setView] = useState('companies')
  const [companyId, setCompanyId] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const currentUser = users.find((user) => user.id === sessionId)
  const visibleCompanies = useMemo(() => !currentUser ? [] : currentUser.type === 'tibox' ? companies : companies.filter((company) => currentUser.companyIds.includes(company.id)), [companies, currentUser])
  const visibleIds = useMemo(() => new Set(visibleCompanies.map((company) => company.id)), [visibleCompanies])
  const visibleIncidents = useMemo(() => incidents.filter((incident) => visibleIds.has(incident.companyId)), [incidents, visibleIds])
  const selectedCompany = visibleCompanies.find((company) => company.id === companyId)
  const isMaintainer = currentUser?.type === 'tibox' && currentUser?.permission === 'editor'
  const canEdit = currentUser?.permission === 'editor'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.removeItem('tiboxReactUsersV2')
  }, [theme])

  useEffect(() => {
    const color = companyColor(selectedCompany)
    const value = color.replace('#', '')
    const rgb = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16)).join(',')
    document.documentElement.style.setProperty('--tenant', color)
    document.documentElement.style.setProperty('--tenant-rgb', rgb)
    document.documentElement.style.setProperty('--tenant-ink', colorInk(color))
  }, [selectedCompany])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const notify = (message) => setToast(message)
  const closeModal = () => setModal(null)

  const login = (userId) => {
    const user = users.find((item) => item.id === userId)
    if (!user) return
    sessionStorage.setItem(STORAGE.session, user.id)
    setSessionId(user.id)
    if (user.type === 'client' && user.companyIds.length === 1) {
      setCompanyId(user.companyIds[0])
      setView('company')
    } else setView('companies')
  }

  const logout = () => {
    sessionStorage.removeItem(STORAGE.session)
    setSessionId('')
    setView('companies')
    setCompanyId('')
  }

  const navigate = (next) => {
    setView(next)
    if (next !== 'company') setCompanyId('')
  }

  const openCompany = (id) => {
    if (!visibleIds.has(id)) return
    setCompanyId(id)
    setView('company')
  }

  const saveDocument = (controlId, record) => {
    setCompanies(companies.map((company) => company.id === companyId ? { ...company, documents: { ...company.documents, [controlId]: record } } : company))
    closeModal()
    notify('Control actualizado correctamente.')
  }

  const saveIncident = (record) => {
    setIncidents(incidents.some((item) => item.id === record.id) ? incidents.map((item) => item.id === record.id ? record : item) : [...incidents, record])
    closeModal()
    notify('Incidente guardado correctamente.')
  }

  const saveUser = (record) => {
    const previous = users.find((item) => item.id === record.id)
    setUsers(previous ? users.map((item) => item.id === record.id ? record : item) : [...users, record])
    closeModal()
    notify('Usuario guardado correctamente.')
  }

  if (!currentUser) return <LoginScreen users={users} onLogin={login} />

  return <div className="min-h-screen text-slate-900 dark:text-slate-100"><Header user={currentUser} view={view} onNavigate={navigate} onLogout={logout} theme={theme} onTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} /><main className="mx-auto max-w-[1540px] px-4 py-8 sm:px-7 lg:px-12">{view === 'companies' && <CompaniesView companies={visibleCompanies} user={currentUser} incidents={visibleIncidents} onOpen={openCompany} onNew={() => setModal({ type: 'company' })} />}{view === 'company' && selectedCompany && <CompanyView company={selectedCompany} incidents={visibleIncidents} user={currentUser} onBack={() => navigate('companies')} onOpenControl={(id) => setModal({ type: 'document', id })} onOpenIncident={(id) => setModal({ type: 'incident', id })} onNewIncident={() => setModal({ type: 'incident', companyId })} onBranding={() => setModal({ type: 'branding' })} />}{view === 'incidents' && <IncidentsView incidents={visibleIncidents} companies={visibleCompanies} canEdit={canEdit} onOpen={(id) => setModal({ type: 'incident', id })} onNew={() => setModal({ type: 'incident' })} />}{view === 'users' && isMaintainer && <UsersView users={users} companies={companies} onOpen={(id) => setModal({ type: 'user', id })} onNew={() => setModal({ type: 'user' })} />}</main>{toast && <div className="toast-in fixed bottom-5 right-5 z-[100] rounded-xl border border-emerald-700/30 bg-emerald-950 px-4 py-3 text-sm text-emerald-100 shadow-2xl">{toast}</div>}{modal?.type === 'document' && selectedCompany && <DocumentModal key={`${companyId}-${modal.id}`} company={selectedCompany} control={CONTROLS.find((control) => control.id === modal.id)} readOnly={!canEdit} onClose={closeModal} onSave={(record) => saveDocument(modal.id, record)} />}{modal?.type === 'incident' && <IncidentModal key={modal.id ?? 'new'} incident={incidents.find((incident) => incident.id === modal.id)} companies={visibleCompanies} preferredCompanyId={modal.companyId} readOnly={!canEdit} onClose={closeModal} onSave={saveIncident} />}{modal?.type === 'user' && isMaintainer && <UserModal key={modal.id ?? 'new'} user={users.find((user) => user.id === modal.id)} companies={companies} onClose={closeModal} onSave={saveUser} />}{modal?.type === 'company' && isMaintainer && <CompanyModal onClose={closeModal} onSave={(company) => { setCompanies([...companies, company]); closeModal(); notify('Empresa creada con 41 controles.') }} />}{modal?.type === 'branding' && selectedCompany && isMaintainer && <BrandingModal company={selectedCompany} onClose={closeModal} onSave={(branding) => { setCompanies(companies.map((company) => company.id === companyId ? { ...company, ...branding } : company)); closeModal(); notify('Personalización guardada.') }} />}</div>
}
