import { useEffect, useState } from 'react'
import { BrowserRouter, Link, useLocation } from 'react-router'
import { Alarm, ArrowLeft, CaretRight, Check, CheckCircle, Clock, DotsThree, Fire, Gear, House, ListPlus, Moon, Pause, Play, Plus, Trash, TrendUp, X } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { z } from 'zod'
import './styles.css'

type Task = { id: string; title: string; note?: string; primary: boolean; completed: boolean }
const taskSchema = z.object({ title: z.string().trim().min(2, 'Escribe al menos 2 caracteres'), note: z.string().optional() })
const initialTasks: Task[] = [
  { id: '1', title: 'Preparar propuesta del proyecto', note: 'Revisar objetivos y próximos pasos', primary: true, completed: false },
  { id: '2', title: 'Responder mensajes pendientes', primary: false, completed: false },
  { id: '3', title: 'Caminar 20 minutos', primary: false, completed: false },
]

function loadTasks() { try { return JSON.parse(localStorage.getItem('focusflow-tasks') ?? 'null') as Task[] ?? initialTasks } catch { return initialTasks } }

function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [showForm, setShowForm] = useState(false)
  const [focusTask, setFocusTask] = useState<Task | null>(null)
  const [notice, setNotice] = useState('')
  useEffect(() => { localStorage.setItem('focusflow-tasks', JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { if (notice) { const id = window.setTimeout(() => setNotice(''), 2600); return () => window.clearTimeout(id) } }, [notice])
  const toggle = (id: string) => { setTasks(items => items.map(t => t.id === id ? { ...t, completed: !t.completed } : t)); setNotice('Tarea actualizada') }
  const remove = (id: string) => { setTasks(items => items.filter(t => t.id !== id)); setNotice('Tarea eliminada') }
  const primary = tasks.find(t => t.primary && !t.completed) ?? tasks.find(t => !t.completed)
  const completed = tasks.filter(t => t.completed).length
  return <BrowserRouter><div className="app-shell">
    {focusTask ? <FocusScreen task={focusTask} onClose={() => setFocusTask(null)} onComplete={() => { toggle(focusTask.id); setFocusTask(null); setNotice('Sesión completada · +25 min') }} /> : <>
      <header className="topbar"><div className="brand-mark">F</div><div><p className="eyebrow">JUEVES, 13 DE AGOSTO</p><h1>Buenos días, Alex</h1></div><button className="icon-button" aria-label="Ajustes"><Gear size={21} /></button></header>
      <main className="content"><section className="hello"><div><span className="lime-dot" /> <span>Tu ritmo de hoy</span></div><p>Un paso enfocado<br /><em>a la vez.</em></p></section>
      <section className="focus-card"><div className="card-top"><span className="label lime-label"><Fire size={15} weight="fill" /> FOCO PRINCIPAL</span><DotsThree size={22} /></div><h2>{primary?.title ?? 'Elige una tarea para empezar'}</h2><p className="muted">{primary?.note ?? 'Crea tu primera tarea y haz que el día avance.'}</p><button className="primary-button" onClick={() => primary ? setFocusTask(primary) : setShowForm(true)}><Play size={17} weight="fill" /> Enfocarme 25 min <CaretRight size={18} /></button></section>
      <section className="timer-strip"><div className="timer-icon"><Clock size={23} /></div><div><strong>Tu próximo bloque</strong><span>25 min de concentración</span></div><span className="ready-pill">LISTO</span></section>
      <div className="section-heading"><h3>Tareas de hoy</h3><button onClick={() => setShowForm(true)} className="add-link"><Plus size={18} /> Añadir</button></div>
      <section className="task-list">{tasks.length === 0 ? <div className="empty"><ListPlus size={30} /><strong>Tu lista está despejada</strong><span>Añade una tarea para comenzar.</span></div> : tasks.map(task => <TaskRow key={task.id} task={task} onToggle={toggle} onRemove={remove} />)}</section>
      <section className="progress-card"><div className="card-top"><div><span className="label">PROGRESO DEL DÍA</span><h3>{completed === tasks.length && tasks.length ? 'Día completo' : 'Construyendo impulso'}</h3></div><div className="progress-number">{tasks.length ? Math.round(completed / tasks.length * 100) : 0}<small>%</small></div></div><div className="progress-track"><motion.div className="progress-fill" animate={{ width: `${tasks.length ? completed / tasks.length * 100 : 0}%` }} /></div><div className="progress-meta"><span>{completed} de {tasks.length} tareas</span><span><Alarm size={15} /> 0 sesiones</span></div></section>
      </main><BottomNav /></>}
    {showForm && <TaskForm onClose={() => setShowForm(false)} onSave={(title, note, makePrimary) => { setTasks(items => [...items.map(t => makePrimary ? { ...t, primary: false } : t), { id: crypto.randomUUID(), title, note, primary: makePrimary || items.length === 0, completed: false }]); setShowForm(false); setNotice('Tarea creada') }} />}
    {notice && <div className="toast"><CheckCircle size={19} weight="fill" /> {notice}</div>}
  </div></BrowserRouter>
}

function TaskRow({ task, onToggle, onRemove }: { task: Task; onToggle: (id: string) => void; onRemove: (id: string) => void }) { return <motion.div layout className={`task-row ${task.completed ? 'done' : ''}`}><button className="check" onClick={() => onToggle(task.id)} aria-label={`Completar ${task.title}`}>{task.completed && <Check size={15} weight="bold" />}</button><div className="task-copy"><strong>{task.title}</strong>{task.note && <span>{task.note}</span>}</div>{task.primary && !task.completed && <span className="mini-tag">FOCO</span>}<button className="delete-button" onClick={() => onRemove(task.id)} aria-label="Eliminar tarea"><Trash size={17} /></button></motion.div> }

function TaskForm({ onClose, onSave }: { onClose: () => void; onSave: (title: string, note: string, primary: boolean) => void }) { const [title, setTitle] = useState(''); const [note, setNote] = useState(''); const [primary, setPrimary] = useState(false); const [error, setError] = useState(''); const save = () => { const result = taskSchema.safeParse({ title, note }); if (!result.success) { setError(result.error.issues[0]?.message ?? 'Revisa el título'); return } onSave(title.trim(), note.trim(), primary) }; return <div className="overlay"><motion.div initial={{ y: 30 }} animate={{ y: 0 }} className="sheet"><div className="sheet-head"><div><span className="eyebrow">NUEVA TAREA</span><h2>¿Qué quieres lograr?</h2></div><button className="icon-button" onClick={onClose}><X size={21} /></button></div><label>Título<input autoFocus value={title} onChange={e => { setTitle(e.target.value); setError('') }} placeholder="Ej. Leer capítulo 3" />{error && <small className="error">{error}</small>}</label><label>Nota <span className="optional">OPCIONAL</span><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Un poco de contexto…" /></label><button className={`primary-button ${!title ? 'disabled' : ''}`} onClick={save}><Check size={18} /> Guardar tarea</button><button className="primary-toggle" onClick={() => setPrimary(!primary)}><span className={`toggle ${primary ? 'on' : ''}`}><span /></span> Marcar como foco principal</button></motion.div></div> }

function FocusScreen({ task, onClose, onComplete }: { task: Task; onClose: () => void; onComplete: () => void }) { const [seconds, setSeconds] = useState(1500); const [running, setRunning] = useState(false); useEffect(() => { if (!running) return; const id = window.setInterval(() => setSeconds(s => { if (s <= 1) { window.clearInterval(id); setRunning(false); return 0 } return s - 1 }), 1000); return () => window.clearInterval(id) }, [running]); const mins = String(Math.floor(seconds / 60)).padStart(2, '0'); const secs = String(seconds % 60).padStart(2, '0'); return <div className="focus-screen"><button className="close-focus" onClick={onClose} aria-label="Cerrar"><ArrowLeft size={21} /></button><div className="focus-center"><div className="focus-orbit"><div className="focus-core"><Moon size={27} weight="fill" /></div></div><span className="eyebrow">SESIÓN DE CONCENTRACIÓN</span><div className="big-time">{mins}:{secs}</div><p>{task.title}</p></div><div className="focus-panel"><span className="label">BLOQUE 01 · 25 MINUTOS</span><h2>Tu atención es el espacio.</h2><div className="focus-actions"><button className="play-focus" onClick={() => seconds === 0 ? onComplete() : setRunning(!running)}>{running ? <Pause size={19} weight="fill" /> : <Play size={19} weight="fill" />} {running ? 'Pausar' : seconds === 0 ? 'Guardar sesión' : 'Comenzar'}</button><button className="finish-focus" onClick={onComplete}>Terminar</button></div></div></div> }
function BottomNav() { const location = useLocation(); return <nav className="bottom-nav"><Link className={location.pathname === '/' ? 'active' : ''} to="/"><House size={21} weight={location.pathname === '/' ? 'fill' : 'regular'} /><span>Hoy</span></Link><Link className={location.pathname === '/progress' ? 'active' : ''} to="/progress"><TrendUp size={21} /><span>Progreso</span></Link></nav> }

export default App
