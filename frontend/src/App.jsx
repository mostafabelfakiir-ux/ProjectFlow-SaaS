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
  ChevronRight,
  Sun,
  Moon,
  TrendingUp,
  Target
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './Dashboard';
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
    dashboard: "Tableau de Bord",
    newProject: "Nouveau Projet",
    editProject: "Modifier le Projet",
    save: "Enregistrer",
    cancel: "Annuler",
    name: "Nom du Projet",
    startDate: "Date de début",
    endDate: "Date de fin",
    manageWorkflows: "Vue d'ensemble de vos projets et finances",
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
    editMissing: "Éditer Pièces Manquantes",
    enterPassword: "Entrez le mot de passe pour supprimer",
    wrongPassword: "Mot de passe incorrect !"
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
    source: "PCE",
    type: "Operation Type",
    client: "Client",
    missing: "Pièces Manquantes",
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
    editMissing: "Edit Pièces Manquantes",
    enterPassword: "Enter password to delete",
    wrongPassword: "Incorrect password!"
  }
};

const opTypes = ["Échange", "Duplicata", "Liquidation de crédit", "Mutation"];

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
      style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: '10px',
        background: type === 'error' ? '#fee2e2' : '#d1fae5', color: type === 'error' ? '#dc2626' : '#059669',
        fontWeight: 600, fontSize: '13px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {message}
    </motion.div>
  );
}

function App() {
  const [lang, setLang] = useState('fr');
  const [projects, setProjects] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [passModal, setPassModal] = useState({ show: false, onConfirm: null });
  const [appPassword, setAppPassword] = useState('1234');

  const t = translations[lang];

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists() && snap.data().app_password) setAppPassword(snap.data().app_password);
    });
    return () => unsub();
  }, []);

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

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleSaveProject = async (projectData) => {
    if (!projectData.name?.trim()) { showToast(lang === 'fr' ? 'Le nom du projet est requis' : 'Project name is required', 'error'); return; }
    try {
      const payload = {
        ...projectData,
        name: projectData.name.trim(),
        start_date: Timestamp.fromDate(new Date(projectData.start_date)),
        end_date: Timestamp.fromDate(new Date(projectData.end_date))
      };
      if (editingProject) {
        await updateDoc(doc(db, "projects", editingProject.id), payload);
        showToast(lang === 'fr' ? 'Projet modifié ✓' : 'Project updated ✓');
      } else {
        await addDoc(collection(db, "projects"), { 
          ...payload,
          progress: 0,
          createdAt: serverTimestamp()
        });
        showToast(lang === 'fr' ? 'Projet créé ✓' : 'Project created ✓');
      }
      setModalOpen(false);
      setEditingProject(null);
    } catch (err) { console.error(err); showToast(lang === 'fr' ? 'Erreur!' : 'Error!', 'error'); }
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
              <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle Theme">
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <LangToggle lang={lang} setLang={setLang} />
            </div>
          </header>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<ProjectsView projects={projects} t={t} setPassModal={setPassModal} onAdd={() => { setEditingProject(null); setModalOpen(true); }} onEdit={(p) => { setEditingProject(p); setModalOpen(true); }} />} />
              <Route path="/project/:id" element={<ProjectDetails projects={projects} t={t} setPassModal={setPassModal} onEdit={(p) => { setEditingProject(p); setModalOpen(true); }} />} />
              <Route path="/dashboard" element={<Dashboard projects={projects} t={t} setPassModal={setPassModal} />} />
            </Routes>
          </main>
        </div>

        <AnimatePresence>
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
          {modalOpen && <ProjectModal t={t} project={editingProject} onSave={handleSaveProject} onClose={() => setModalOpen(false)} />}
          {passModal.show && (
            <PasswordModal 
              t={t}
              appPassword={appPassword}
              onClose={() => setPassModal({ show: false, onConfirm: null })} 
              onSuccess={() => {
                if (passModal.onConfirm) passModal.onConfirm();
                setPassModal({ show: false, onConfirm: null });
                showToast(lang === 'fr' ? 'Supprimé ✓' : 'Deleted ✓');
              }} 
            />
          )}
        </AnimatePresence>
      </div>
    </Router>
  );
}

function PasswordModal({ t, onClose, onSuccess, appPassword = '1234' }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (pw === appPassword) {
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card modal-content" style={{ maxWidth: '320px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '16px' }}>{t.enterPassword}</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '0 0 10px 0' }}>
            <input 
              autoFocus
              type="password" 
              className={`input-field ${error ? 'border-danger' : ''}`} 
              placeholder="****" 
              value={pw} 
              onChange={e => setPw(e.target.value)} 
              style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '4px', borderColor: error ? 'var(--danger)' : '' }}
            />
            {error && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>{t.wrongPassword}</p>}
          </div>
          <div className="modal-footer" style={{ border: 'none', marginTop: '0' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
            <button type="submit" className="btn btn-primary">{t.save}</button>
          </div>
        </form>
      </motion.div>
    </div>
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

function ProjectsView({ projects, t, onAdd, onEdit, setPassModal }) {
  const [tasks, setTasks] = useState([]);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [servicesTotal, setServicesTotal] = useState(0);
  const [settings, setSettings] = useState({ monthly_target: 10000, daily_target: 500 });

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, "global_tasks"), snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const serviceKeys = ['edp', 'narsa', 'radiif', 'p2', 'pm', 'em', 'wu', 'ria', 'mg'];
    const unsubDaily = onSnapshot(collection(db, "daily_goals"), snap => {
      const entries = snap.docs.map(d => d.data());
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayEntry = entries.find(e => e.date === todayStr);
      setServicesTotal(todayEntry ? serviceKeys.reduce((sum, k) => sum + Number(todayEntry[k] || 0), 0) : 0);
      const currentMonth = format(new Date(), 'yyyy-MM');
      const mTotal = entries.filter(e => e.date?.startsWith(currentMonth))
        .reduce((acc, e) => acc + serviceKeys.reduce((s, k) => s + Number(e[k] || 0), 0), 0);
      setMonthlyTotal(mTotal);
    });
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), docSnap => {
      if(docSnap.exists()) setSettings(docSnap.data());
    });
    return () => { unsubTasks(); unsubDaily(); unsubSettings(); };
  }, []);

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const progressDaily  = Math.min((servicesTotal  / (settings.daily_target  || 1)) * 100, 100).toFixed(1);
  const progressMonthly = Math.min((monthlyTotal / (settings.monthly_target || 1)) * 100, 100).toFixed(1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="page-title">{t.dashboard}</h2>
          <p className="page-subtitle">{t.manageWorkflows}</p>
        </div>
        <button className="btn btn-primary" onClick={onAdd}><Plus size={18} /> {t.newProject}</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {/* Card 1 — Tasks */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #ef4444', cursor: 'pointer' }} onClick={() => setShowTasksModal(true)}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tâches (Tasks)</span>
            <CheckCircle2 size={16} color="#ef4444" />
          </div>
          <div className="stat-value" style={{ color: pendingTasks > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {pendingTasks} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>En attente</span>
          </div>
        </div>

        {/* Card 2 — Objectif Journalier */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Objectif Journalier</span>
            <TrendingUp size={16} color="#10b981" />
          </div>
          <div className="stat-value">{servicesTotal.toLocaleString()} <span className="currency">DH</span></div>
          <div className="progress-bg" style={{ marginTop: '10px' }}>
            <div className="progress-fill" style={{ width: `${progressDaily}%`, background: '#10b981' }}></div>
          </div>
          <div style={{ fontSize: '12px', marginTop: '5px', color: 'var(--text-secondary)' }}>{progressDaily}% de {settings.daily_target} DH</div>
        </div>

        {/* Card 3 — Objectifs Mensuels */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Objectifs Mensuels</span>
            <Target size={16} color="var(--accent-color)" />
          </div>
          <div className="stat-value">{monthlyTotal.toLocaleString()} <span className="currency">DH</span></div>
          <div className="progress-bg" style={{ marginTop: '10px' }}>
            <div className="progress-fill" style={{ width: `${progressMonthly}%`, background: 'var(--accent-color)' }}></div>
          </div>
          <div style={{ fontSize: '12px', marginTop: '5px', color: 'var(--text-secondary)' }}>{progressMonthly}% de {settings.monthly_target} DH</div>
        </div>
      </div>

      <div className="project-grid">
        {projects.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
            <Layout size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>Aucun projet pour le moment</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: 20 }}>Créez votre premier projet pour commencer</p>
            <button className="btn btn-primary" onClick={onAdd}><Plus size={18} /> {t.newProject}</button>
          </div>
        ) : projects.map(project => (
          <ProjectCard key={project.id} project={project} t={t} onEdit={() => onEdit(project)} setPassModal={setPassModal} />
        ))}
      </div>

      <AnimatePresence>
        {showTasksModal && (
          <TasksModal tasks={tasks} onClose={() => setShowTasksModal(false)} t={t} setPassModal={setPassModal} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TasksModal({ tasks, onClose, t, setPassModal }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const handleAddTask = async () => {
    if(!newTaskTitle) return;
    await addDoc(collection(db, "global_tasks"), { title: newTaskTitle, completed: false, createdAt: serverTimestamp() });
    setNewTaskTitle('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3>Checklist des Tâches</h3>
          <button onClick={onClose} className="btn-icon-sm"><X /></button>
        </div>
        <div className="modal-body">
          <div className="task-list">
            {tasks.map(task => (
              <div key={task.id} className="task-row">
                <div className="task-main">
                  <div onClick={() => updateDoc(doc(db, "global_tasks", task.id), { completed: !task.completed })}
                    className={`checkbox ${task.completed ? 'checked' : ''}`}>
                    {task.completed && <Check size={14} color="white" />}
                  </div>
                  <span className={task.completed ? 'completed' : ''}>{task.title}</span>
                </div>
                <button className="btn-icon-danger" onClick={() => {
                  setPassModal({ 
                    show: true, 
                    onConfirm: () => deleteDoc(doc(db, "global_tasks", task.id)) 
                  });
                }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="task-input-box" style={{ marginTop: '20px' }}>
            <input className="input-field" placeholder="Ajouter une tâche..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTask()} />
            <button className="btn btn-primary" onClick={handleAddTask}><Plus size={18} /></button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProjectCard({ project, t, onEdit, setPassModal }) {
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
    setPassModal({
      show: true,
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          const ops = await getDocs(query(collection(db, "operations"), where("project_id", "==", project.id)));
          ops.forEach(d => batch.delete(d.ref));
          const tks = await getDocs(query(collection(db, "tasks"), where("project_id", "==", project.id)));
          tks.forEach(d => batch.delete(d.ref));
          batch.delete(doc(db, "projects", project.id));
          await batch.commit();
        } catch (err) { console.error(err); }
      }
    });
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
          <button onClick={handleDelete} className="btn-icon-sm btn-icon-danger" title={t.deleteConfirm}><Trash2 size={14} /></button>
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

function ProjectDetails({ projects, t, onEdit, setPassModal }) {
  const { id } = useParams();
  const nav = useNavigate();
  const project = projects.find(p => p.id === id);
  const [operations, setOperations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('ops');
  const [newOp, setNewOp] = useState({ date: format(new Date(), 'yyyy-MM-dd'), source: 'SGO', type: opTypes[0], matricule: '', client: false, missing: '', amount_ht: '', tva: '' });
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
    let lastProgress = null;
    const unsubTasks = onSnapshot(query(collection(db, "tasks"), where("project_id", "==", id)), (snap) => {
      const taskList = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() })).sort((a, b) => a.createdAt - b.createdAt);
      setTasks(taskList);
      const p = taskList.length > 0 ? Math.round((taskList.filter(tk => tk.completed).length / taskList.length) * 100) : 0;
      if (p !== lastProgress) {
        lastProgress = p;
        updateDoc(doc(db, "projects", id), { progress: p });
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
      setNewOp({ date: format(new Date(), 'yyyy-MM-dd'), source: 'SGO', type: opTypes[0], matricule: '', client: false, missing: '', amount_ht: '', tva: '' });
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
          <>
            {/* ── Form fixe ── */}
            <div className="card op-form-card">
              <div className="op-form-grid">
                <div className="form-group-sm">
                  <label className="label">{t.date}</label>
                  <input type="date" className="input-field" value={newOp.date} onChange={e => setNewOp({...newOp, date: e.target.value})} />
                </div>
                <div className="form-group-sm">
                  <label className="label">{t.source}</label>
                  <select className="input-field" value={newOp.source} onChange={e => setNewOp({...newOp, source: e.target.value})}>
                    <option>SGO</option><option>PCE</option>
                  </select>
                </div>
                <div className="form-group-sm">
                  <label className="label">{t.type}</label>
                  <select className="input-field" value={newOp.type} onChange={e => setNewOp({...newOp, type: e.target.value})}>
                    {opTypes.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group-sm">
                  <label className="label">{t.matricule}</label>
                  <input type="text" className="input-field" value={newOp.matricule} onChange={e => setNewOp({...newOp, matricule: e.target.value})} placeholder={t.matricule} />
                </div>
                <div className="form-group-sm">
                  <label className="label">{t.ht}</label>
                  <input type="number" className="input-field" value={newOp.amount_ht} onChange={e => setNewOp({...newOp, amount_ht: e.target.value})} onFocus={e => e.target.select()} placeholder="0" min="0" />
                </div>
                <div className="form-group-sm">
                  <label className="label">{t.tva}</label>
                  <input type="number" className="input-field" value={newOp.tva} onChange={e => setNewOp({...newOp, tva: e.target.value})} onFocus={e => e.target.select()} placeholder="0" min="0" />
                </div>
                <div className="form-group-sm">
                  <label className="label">{t.missing}</label>
                  <input className="input-field" value={newOp.missing} onChange={e => setNewOp({...newOp, missing: e.target.value})} placeholder={t.missing} />
                </div>
                <div className="form-group-sm">
                  <span className="label">&nbsp;</span>
                  <div className="op-ttc-btn">
                    <label className="client-check-label">
                      <input type="checkbox" checked={newOp.client} onChange={e => setNewOp({...newOp, client: e.target.checked})} />
                      {t.client}
                    </label>
                    <span className="ttc-preview">{(Number(newOp.amount_ht || 0) + Number(newOp.tva || 0)).toLocaleString()} DH</span>
                    <button className="btn btn-primary op-add-btn" onClick={handleAddOp}><Plus size={16} /> Ajouter</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Table lecture seule ── */}
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
                        <td><button className="btn-icon-danger" onClick={() => {
                          setPassModal({
                            show: true,
                            onConfirm: () => deleteDoc(doc(db, "operations", op.id))
                          });
                        }}><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
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
                  <button className="btn-icon-danger" onClick={() => {
                    setPassModal({
                      show: true,
                      onConfirm: () => deleteDoc(doc(db, "tasks", task.id))
                    });
                  }}><Trash2 size={14} /></button>
                </div>
              ))}
              <div className="task-input-box">
                <input className="input-field" placeholder={t.newTask} value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && (async () => { if(!newTaskTitle) return; await addDoc(collection(db, "tasks"), { project_id: id, title: newTaskTitle, completed: false, createdAt: serverTimestamp() }); setNewTaskTitle(''); })()} />
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



export default App;
