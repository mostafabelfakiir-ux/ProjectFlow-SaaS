import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useParams, 
  useNavigate,
  useLocation
} from 'react-router-dom';
import { 
  Plus, 
  Calendar, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowLeft,
  FileText,
  Check,
  Trash2,
  Menu,
  X,
  Edit2,
  DollarSign,
  Layout,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  doc, 
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const translations = {
  fr: {
    projects: "Projets",
    dashboard: "Dashboard",
    newProject: "Nouveau Projet",
    editProject: "Modifier le Projet",
    save: "Enregistrer",
    cancel: "Annuler",
    name: "Nom du Projet",
    startDate: "Date de début",
    endDate: "Date de fin",
    manageWorkflows: "Gérez vos flux de travail et vos tâches.",
    progress: "Progrès",
    tasks: "Tâches",
    operations: "Opérations",
    back: "Retour",
    date: "La date",
    source: "Type Operation",
    type: "Détail Operation",
    matricule: "Matricule",
    client: "Client",
    missing: "Les pièces manquantes",
    ht: "Paiement Net",
    tva: "Frais Paiement",
    ttc: "Total TTC",
    duration: "Durée",
    priority: "Priorité",
    status: "Statut",
    totalCa: "Total CA (HT)",
    totalTva: "Total TVA",
    monthlyWallet: "Portefeuille Mensuel",
    month: "Mois",
    deleteConfirm: "Supprimer ?",
    newTask: "Nouvelle tâche...",
    loading: "Chargement...",
    editMissing: "Éditer dossiers manquants"
  },
  en: {
    projects: "Projects",
    dashboard: "Dashboard",
    newProject: "New Project",
    editProject: "Edit Project",
    save: "Save",
    cancel: "Cancel",
    name: "Project Name",
    startDate: "Start Date",
    endDate: "End Date",
    manageWorkflows: "Manage your workflows and tasks.",
    progress: "Progress",
    tasks: "Tasks",
    operations: "Operations",
    back: "Back",
    date: "Date",
    source: "SGE / ORPCC",
    type: "Operation Type",
    client: "Client",
    missing: "Missing Docs",
    ht: "Amount HT",
    tva: "TVA",
    ttc: "Total TTC",
    duration: "Duration",
    priority: "Priority",
    status: "Status",
    totalCa: "Total Revenue (HT)",
    totalTva: "Total TVA",
    monthlyWallet: "Monthly Wallet",
    month: "Month",
    deleteConfirm: "Delete ?",
    newTask: "New task...",
    loading: "Loading...",
    editMissing: "Edit missing docs"
  }
};

const opTypes = ["Change", "Duplicata", "Liquidation de crédit", "Mutation"];

function App() {
  const [lang, setLang] = useState('fr');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const t = translations[lang];

  useEffect(() => {
    const q = collection(db, "projects");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start_date: data.start_date && typeof data.start_date.toDate === 'function' ? data.start_date.toDate().toISOString().split('T')[0] : data.start_date,
          end_date: data.end_date && typeof data.end_date.toDate === 'function' ? data.end_date.toDate().toISOString().split('T')[0] : data.end_date,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      }).sort((a, b) => b.createdAt - a.createdAt);
      setProjects(projectsList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveProject = async (projectData) => {
    try {
      const payload = {
        ...projectData,
        start_date: Timestamp.fromDate(new Date(projectData.start_date)),
        end_date: Timestamp.fromDate(new Date(projectData.end_date))
      };
      if (editingProject) {
        await updateDoc(doc(db, "projects", editingProject.id), payload);
      } else {
        await addDoc(collection(db, "projects"), { 
          ...payload,
          progress: 0,
          createdAt: serverTimestamp()
        });
      }
      setModalOpen(false);
      setEditingProject(null);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="loading-screen">
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Settings size={40} color="var(--accent-color)" /></motion.div>
  </div>;

  return (
    <Router>
      <div className={`app-container ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} t={t} />
        
        <div className="content-wrapper">
          <header className="main-header">
            <div className="header-left">
              <button onClick={() => setIsSidebarOpen(true)} className="mobile-menu-btn"><Menu size={24} /></button>
              <h1 className="header-title">ProjectFlow</h1>
            </div>
            <div className="header-right">
              <LangToggle lang={lang} setLang={setLang} />
            </div>
          </header>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<ProjectsView projects={projects} t={t} onAdd={() => { setEditingProject(null); setModalOpen(true); }} onEdit={(p) => { setEditingProject(p); setModalOpen(true); }} />} />
              <Route path="/project/:id" element={<ProjectDetails projects={projects} t={t} onEdit={(p) => { setEditingProject(p); setModalOpen(true); }} />} />
              <Route path="/dashboard" element={<Dashboard projects={projects} t={t} />} />
            </Routes>
          </main>
        </div>

        <AnimatePresence>
          {modalOpen && <ProjectModal t={t} project={editingProject} onSave={handleSaveProject} onClose={() => setModalOpen(false)} />}
        </AnimatePresence>
      </div>
    </Router>
  );
}

function ProjectModal({ t, project, onSave, onClose }) {
  const nextMonthStart = startOfMonth(addMonths(new Date(), 1));
  const nextMonthEnd = endOfMonth(addMonths(new Date(), 1));
  
  const [data, setData] = useState(project || { 
    name: '', 
    start_date: format(nextMonthStart, 'yyyy-MM-dd'), 
    end_date: format(nextMonthEnd, 'yyyy-MM-dd'), 
    priority: 'Medium', 
    status: 'Not started' 
  });

  return (
    <div className="modal-overlay">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="card modal-content">
        <div className="modal-header">
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{project ? t.editProject : t.newProject}</h2>
          <button onClick={onClose} className="btn-icon-sm"><X /></button>
        </div>
        <div className="modal-body">
          <div className="form-group"><label className="label">{t.name}</label><input className="input-field" value={data.name} onChange={e => setData({...data, name: e.target.value})} /></div>
          <div className="form-row">
            <div className="form-group"><label className="label">{t.startDate}</label><input type="date" className="input-field" value={data.start_date} onChange={e => setData({...data, start_date: e.target.value})} /></div>
            <div className="form-group"><label className="label">{t.endDate}</label><input type="date" className="input-field" value={data.end_date} onChange={e => setData({...data, end_date: e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="label">{t.priority}</label>
            <select className="input-field" value={data.priority} onChange={e => setData({...data, priority: e.target.value})}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </div>
          <div className="form-group"><label className="label">{t.status}</label>
            <select className="input-field" value={data.status} onChange={e => setData({...data, status: e.target.value})}>
              <option>Not started</option><option>In progress</option><option>Done</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
          <button className="btn btn-primary" onClick={() => onSave(data)}>{t.save}</button>
        </div>
      </motion.div>
    </div>
  );
}

const LangToggle = ({ lang, setLang }) => (
  <div className="lang-toggle">
    <button className={`lang-btn ${lang === 'fr' ? 'active' : ''}`} onClick={() => setLang('fr')}>FR</button>
    <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
  </div>
);

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed, t }) => {
  const location = useLocation();
  const nav = useNavigate();
  const menuItems = [
    { path: '/', icon: Layout, label: t.projects },
    { path: '/dashboard', icon: BarChart3, label: t.dashboard }
  ];
  return (
    <>
      <div className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-box">PF</div>
          {!isCollapsed && <span>ProjectFlow</span>}
          <button className="collapse-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button className="close-sidebar" onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button key={item.path} className={`sidebar-btn ${location.pathname === item.path ? 'active' : ''}`} 
              onClick={() => { nav(item.path); setIsSidebarOpen(false); }} title={isCollapsed ? item.label : ''}>
              <item.icon size={18} /> 
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

function ProjectsView({ projects, t, onAdd, onEdit }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">{t.projects}</h2>
          <p className="page-subtitle">{t.manageWorkflows}</p>
        </div>
        <button className="btn btn-primary" onClick={onAdd}><Plus size={18} /> {t.newProject}</button>
      </div>
      <div className="project-grid">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} t={t} onEdit={() => onEdit(project)} />
        ))}
      </div>
    </motion.div>
  );
}

function ProjectCard({ project, t, onEdit }) {
  const nav = useNavigate();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "tasks"), where("project_id", "==", project.id)), (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, 3));
    });
    return () => unsub();
  }, [project.id]);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm(t.deleteConfirm)) {
      try {
        const batch = writeBatch(db);
        // Cascading delete: delete operations and tasks for this project
        const ops = await getDocs(query(collection(db, "operations"), where("project_id", "==", project.id)));
        ops.forEach(d => batch.delete(d.ref));
        const tks = await getDocs(query(collection(db, "tasks"), where("project_id", "==", project.id)));
        tks.forEach(d => batch.delete(d.ref));
        batch.delete(doc(db, "projects", project.id));
        await batch.commit();
      } catch (err) { console.error(err); }
    }
  };

  return (
    <motion.div whileHover={{ y: -4 }} className="card project-card" onClick={() => nav(`/project/${project.id}`)}>
      <div className="card-header">
        <div className="project-name-box">
          <div className="project-dot"></div>
          <h3>{project.name}</h3>
        </div>
        <div className="card-actions">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="btn-icon-sm"><Edit2 size={14} /></button>
          <button onClick={handleDelete} className="btn-icon-sm btn-icon-danger"><Trash2 size={14} /></button>
        </div>
      </div>
      
      <div className="card-body">
        <div className="property-item">
          <Calendar size={14} className="prop-icon" />
          <span className="prop-label">{t.duration}</span>
          <span className="prop-value">{project.start_date} → {project.end_date}</span>
        </div>
        <div className="property-item">
          <AlertCircle size={14} className="prop-icon" />
          <span className="prop-label">{t.priority}</span>
          <span className={`badge badge-${project.priority?.toLowerCase()}`}>{project.priority}</span>
        </div>
        <div className="property-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <BarChart3 size={14} className="prop-icon" />
              <span className="prop-label">{t.progress}</span>
            </div>
            <span className="prop-value" style={{ fontWeight: '800' }}>{project.progress || 0}%</span>
          </div>
          <div className="progress-bg"><div className="progress-fill" style={{ width: `${project.progress || 0}%` }}></div></div>
        </div>
        <div className="property-item">
          <Clock size={14} className="prop-icon" />
          <span className="prop-label">{t.status}</span>
          <span className={`badge badge-${(project.status || 'Not-started').toLowerCase().replace(' ', '-')}`}>{project.status}</span>
        </div>

        {tasks.length > 0 && (
          <div className="card-tasks">
            <div className="tasks-label"><CheckCircle2 size={13} /> {t.tasks}</div>
            {tasks.map(task => (
              <div key={task.id} className="task-mini"><FileText size={11} /> <span>{task.title}</span></div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ProjectDetails({ projects, t, onEdit }) {
  const { id } = useParams();
  const nav = useNavigate();
  const project = projects.find(p => p.id === id);
  const [operations, setOperations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('ops');
  const [newOp, setNewOp] = useState({ date: format(new Date(), 'yyyy-MM-dd'), source: 'CGe', type: opTypes[0], matricule: '', client: false, missing: '', amount_ht: '', tva: '' });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingMissing, setEditingMissing] = useState(null);

  useEffect(() => {
    if (!id) return;
    const unsubOps = onSnapshot(query(collection(db, "operations"), where("project_id", "==", id)), (snap) => {
      setOperations(snap.docs.map(doc => ({ 
        id: doc.id, ...doc.data(), 
        date_str: doc.data().date?.toDate().toISOString().split('T')[0],
        date_obj: doc.data().date?.toDate() || new Date()
      })).sort((a, b) => b.date_obj - a.date_obj));
    });
    const unsubTasks = onSnapshot(query(collection(db, "tasks"), where("project_id", "==", id)), (snap) => {
      const taskList = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() })).sort((a, b) => a.createdAt - b.createdAt);
      setTasks(taskList);
      if (taskList.length > 0) {
        const p = Math.round((taskList.filter(tk => tk.completed).length / taskList.length) * 100);
        updateDoc(doc(db, "projects", id), { progress: p });
      } else {
        updateDoc(doc(db, "projects", id), { progress: 0 });
      }
    });
    return () => { unsubOps(); unsubTasks(); };
  }, [id]);

  if (!project) return <div className="loading-screen">{t.loading}</div>;

  const handleAddOp = async () => {
    if (!newOp.amount_ht) return;
    try {
      await addDoc(collection(db, "operations"), { 
        ...newOp, project_id: id, date: Timestamp.fromDate(new Date(newOp.date)),
        amount_ht: Number(newOp.amount_ht), tva: Number(newOp.tva)
      });
      setNewOp({ date: format(new Date(), 'yyyy-MM-dd'), source: 'CGe', type: opTypes[0], matricule: '', client: false, missing: '', amount_ht: '', tva: '' });
    } catch (err) { console.error(err); }
  };

  const handleUpdateMissing = async () => {
    if (!editingMissing) return;
    await updateDoc(doc(db, "operations", editingMissing.id), { missing: editingMissing.text });
    setEditingMissing(null);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
      <div className="detail-header">
        <button className="btn btn-secondary btn-sm" onClick={() => nav('/')}><ArrowLeft size={16} /> {t.back}</button>
        <div className="detail-title-row">
          <h2 className="project-title-large">{project.name}</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(project)}><Edit2 size={14} /> {t.editProject}</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'ops' ? 'active' : ''}`} onClick={() => setActiveTab('ops')}><DollarSign size={16} /> {t.operations}</button>
        <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}><CheckCircle2 size={16} /> {t.tasks}</button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'ops' ? (
          <div className="card table-card">
            <div className="table-container scrollable">
              <table>
                <thead>
                  <tr>
                    <th>{t.date}</th>
                    <th>{t.source}</th>
                    <th>{t.type}</th>
                    <th>{t.matricule}</th>
                    <th>{t.client}</th>
                    <th>{t.missing}</th>
                    <th>{t.ht}</th>
                    <th>{t.tva}</th>
                    <th>{t.ttc}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map(op => (
                    <tr key={op.id}>
                      <td className="td-date">{op.date_str}</td>
                      <td className="td-source">{op.source}</td>
                      <td><span className="badge badge-low">{op.type}</span></td>
                      <td className="td-center">{op.matricule || '--'}</td>
                      <td className="td-center">{op.client ? <Check size={16} color="#10b981" /> : <X size={16} color="#ef4444" />}</td>
                      <td className="td-missing">
                        <div className="missing-box">
                          <span>{op.missing || '--'}</span>
                          <button onClick={() => setEditingMissing({ id: op.id, text: op.missing || '' })} className="btn-icon-xs"><Edit2 size={11} /></button>
                        </div>
                      </td>
                      <td className="td-amount">{Number(op.amount_ht || 0).toLocaleString()}</td>
                      <td className="td-amount">{Number(op.tva || 0).toLocaleString()}</td>
                      <td className="td-ttc">{(Number(op.amount_ht || 0) + Number(op.tva || 0)).toLocaleString()}</td>
                      <td><button className="btn-icon-danger" onClick={() => deleteDoc(doc(db, "operations", op.id))}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                  <tr className="input-row">
                    <td><input type="date" className="input-sm" value={newOp.date} onChange={e => setNewOp({...newOp, date: e.target.value})} /></td>
                    <td><select className="input-sm" value={newOp.source} onChange={e => setNewOp({...newOp, source: e.target.value})}><option>CGe</option><option>PCE</option></select></td>
                    <td><select className="input-sm" value={newOp.type} onChange={e => setNewOp({...newOp, type: e.target.value})}>{opTypes.map(o => <option key={o}>{o}</option>)}</select></td>
                    <td><input type="text" className="input-sm" value={newOp.matricule} onChange={e => setNewOp({...newOp, matricule: e.target.value})} placeholder={t.matricule} /></td>
                    <td className="td-center"><input type="checkbox" checked={newOp.client} onChange={e => setNewOp({...newOp, client: e.target.checked})} /></td>
                    <td><input className="input-sm" value={newOp.missing} onChange={e => setNewOp({...newOp, missing: e.target.value})} placeholder={t.missing} /></td>
                    <td><input type="number" className="input-sm" value={newOp.amount_ht} onChange={e => setNewOp({...newOp, amount_ht: e.target.value})} /></td>
                    <td><input type="number" className="input-sm" value={newOp.tva} onChange={e => setNewOp({...newOp, tva: e.target.value})} /></td>
                    <td className="td-ttc">{(Number(newOp.amount_ht) + Number(newOp.tva)).toLocaleString()}</td>
                    <td><button className="btn btn-primary btn-sm" onClick={handleAddOp}><Plus size={16} /></button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card task-container-large">
            <div className="task-list">
              {tasks.map(task => (
                <div key={task.id} className="task-row">
                  <div className="task-main">
                    <div onClick={() => updateDoc(doc(db, "tasks", task.id), { completed: !task.completed })}
                      className={`checkbox ${task.completed ? 'checked' : ''}`}>
                      {task.completed && <Check size={14} color="white" />}
                    </div>
                    <span className={task.completed ? 'completed' : ''}>{task.title}</span>
                  </div>
                  <button className="btn-icon-danger" onClick={() => deleteDoc(doc(db, "tasks", task.id))}><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="task-input-box">
                <input className="input-field" placeholder={t.newTask} value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyPress={e => e.key === 'Enter' && (async () => { if(!newTaskTitle) return; await addDoc(collection(db, "tasks"), { project_id: id, title: newTaskTitle, completed: false, createdAt: serverTimestamp() }); setNewTaskTitle(''); })()} />
                <button className="btn btn-primary" onClick={async () => { if(!newTaskTitle) return; await addDoc(collection(db, "tasks"), { project_id: id, title: newTaskTitle, completed: false, createdAt: serverTimestamp() }); setNewTaskTitle(''); }}><Plus size={18} /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingMissing && (
          <div className="modal-overlay">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card modal-content">
              <div className="modal-header"><h3>{t.editMissing}</h3><button onClick={() => setEditingMissing(null)} className="btn-icon-sm"><X /></button></div>
              <textarea className="input-field" style={{ minHeight: '150px' }} value={editingMissing.text} onChange={e => setEditingMissing({...editingMissing, text: e.target.value})} />
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditingMissing(null)}>{t.cancel}</button>
                <button className="btn btn-primary" onClick={handleUpdateMissing}>{t.save}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Dashboard({ projects, t }) {
  const [data, setData] = useState({ total_ht: 0, total_tva: 0, wallet: {} });
  
  useEffect(() => {
    // Only count operations belonging to projects that currently exist
    const projectIds = projects.map(p => p.id);
    
    const unsubscribe = onSnapshot(collection(db, "operations"), (snapshot) => {
      let ht = 0; let tva_val = 0; let wallet = {};
      
      snapshot.docs.forEach(doc => {
        const d = doc.data();
        
        // Safety check: Only count if project exists
        if (!projectIds.includes(d.project_id)) return;

        const opDate = d.date?.toDate() || new Date();
        const monthYear = format(opDate, 'MMMM yyyy');
        
        const val_ht = Number(d.amount_ht) || 0;
        const val_tva = Number(d.tva) || 0;
        
        ht += val_ht;
        tva_val += val_tva;
        
        if (!wallet[monthYear]) {
          wallet[monthYear] = { ht: 0, tva: 0, ttc: 0 };
        }
        wallet[monthYear].ht += val_ht;
        wallet[monthYear].tva += val_tva;
        wallet[monthYear].ttc += (val_ht + val_tva);
      });
      
      setData({ total_ht: ht, total_tva: tva_val, wallet });
    });
    
    return () => unsubscribe();
  }, [projects]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="page-title" style={{ marginBottom: '32px' }}>{t.dashboard}</h2>
      <div className="stats-grid">
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
          <div className="stat-label">{t.totalCa}</div>
          <div className="stat-value">{data.total_ht.toLocaleString()} <span className="currency">DH</span></div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-label">{t.totalTva}</div>
          <div className="stat-value">{data.total_tva.toLocaleString()} <span className="currency">DH</span></div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-label">Total {t.ttc}</div>
          <div className="stat-value">{(data.total_ht + data.total_tva).toLocaleString()} <span className="currency">DH</span></div>
        </div>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>{t.monthlyWallet}</h3>
        <div className="table-container scrollable">
          <table>
            <thead>
              <tr><th>{t.month}</th><th>{t.ht}</th><th>{t.tva}</th><th>{t.ttc}</th></tr>
            </thead>
            <tbody>
              {Object.entries(data.wallet).sort((a,b) => new Date(b[0]) - new Date(a[0])).map(([month, totals]) => (
                <tr key={month}>
                  <td style={{ fontWeight: '700' }}>{month}</td>
                  <td className="td-amount">{totals.ht.toLocaleString()} DH</td>
                  <td className="td-amount">{totals.tva.toLocaleString()} DH</td>
                  <td style={{ fontWeight: '800', color: 'var(--accent-color)' }} className="td-amount">{totals.ttc.toLocaleString()} DH</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

export default App;
