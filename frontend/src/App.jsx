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
  Inbox,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  TrendingUp,
  Target,
  LogOut,
  UserCog
} from 'lucide-react';
import LoginPage from './LoginPage';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './Dashboard';
import logo from './assets/logo-barid.png';
import { db, auth, firebaseConfig } from './firebase';
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
  getDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as fbSignIn,
  updatePassword,
  deleteUser as fbDeleteUser
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { nameToEmail, toFirebaseEmail } from './LoginPage';

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
    clientName: "Nom du client présenté",
    missing: "Les pièces manquantes",
    ht: "Net Payment",
    tva: "Payment Fees",
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
    clientName: "Client Name",
    missing: "Pièces Manquantes",
    ht: "Net Payment",
    tva: "Payment Fees",
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

const opTypes = ["Mutation", "Change", "Duplicata", "Liquidation de crédit", "Déclaration", "Location", "Retrait", "Plus", "Moins"];

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
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
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
  const [financialData, setFinancialData] = useState({ servicesTotal: 0, monthlyTotal: 0, fraisByDate: {}, demandesToday: 0, demandesTotal: 0 });

  // Auth — with 4s fallback timeout for slow mobile connections
  useEffect(() => {
    const fallback = setTimeout(() => setAuthChecked(true), 4000);
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(fallback);
      if (fbUser) {
        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid));
          if (snap.exists()) {
            setCurrentUser({ uid: fbUser.uid, ...snap.data() });
          } else {
            await signOut(auth);
            setCurrentUser(null);
          }
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthChecked(true);
    });
    return () => { unsub(); clearTimeout(fallback); };
  }, []);

  const handleLogout = () => signOut(auth);

  const t = translations[lang];

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Settings listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists() && snap.data().app_password) setAppPassword(snap.data().app_password);
    });
    return () => unsub();
  }, []);

  // Projects listener — 3s timeout
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000);
    const unsub = onSnapshot(collection(db, "projects"), (snapshot) => {
      clearTimeout(timeout);
      const list = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id, ...data,
          start_date: data.start_date?.toDate ? data.start_date.toDate().toISOString().split('T')[0] : data.start_date,
          end_date: data.end_date?.toDate ? data.end_date.toDate().toISOString().split('T')[0] : data.end_date,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      }).sort((a, b) => b.createdAt - a.createdAt);
      setProjects(list);
      setLoading(false);
    }, () => { clearTimeout(timeout); setLoading(false); });
    return () => { unsub(); clearTimeout(timeout); };
  }, []);

  // Single operations listener — shared across Sidebar, ProjectsView, Dashboard
  // Zero-base: only sums the 'tva' (Frais) field — nothing else
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "operations"), snap => {
      const fraisMap = {};
      let totalOps = 0;
      let todayOps = 0;
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const currentMonth = format(new Date(), 'yyyy-MM');

      snap.docs.forEach(d => {
        const data = d.data();
        const dateStr = data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : null;
        if (dateStr) {
          const fraisValue = Number(data.tva || 0);
          fraisMap[dateStr] = (fraisMap[dateStr] || 0) + fraisValue;
          totalOps++;
          if (dateStr === todayStr) todayOps++;
        }
      });

      // Revenu du Jour = STRICTLY sum of Frais for today only
      const dailyFrais = fraisMap[todayStr] || 0;
      // Revenu du Mois = sum of Frais for the current month only
      const monthlyFrais = Object.entries(fraisMap)
        .filter(([d]) => d.startsWith(currentMonth))
        .reduce((acc, [, v]) => acc + v, 0);

      setFinancialData({
        servicesTotal: dailyFrais,
        monthlyTotal: monthlyFrais,
        fraisByDate: fraisMap,
        demandesToday: todayOps,
        demandesTotal: totalOps
      });
    });
    return () => unsub();
  }, []);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleSaveProject = async (projectData) => {
    if (!projectData.name?.trim()) { showToast('Le nom du projet est requis', 'error'); return; }
    if (!projectData.start_date || !projectData.end_date) { showToast('Les dates sont requises', 'error'); return; }
    const startD = new Date(projectData.start_date);
    const endD = new Date(projectData.end_date);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime())) { showToast('Dates invalides', 'error'); return; }
    try {
      const payload = {
        name: projectData.name.trim(),
        start_date: Timestamp.fromDate(startD),
        end_date: Timestamp.fromDate(endD),
        priority: projectData.priority || 'Medium',
        status: projectData.status || 'Not started'
      };
      if (editingProject) {
        await updateDoc(doc(db, "projects", editingProject.id), payload);
        showToast('Projet modifié ✓');
      } else {
        await addDoc(collection(db, "projects"), { ...payload, progress: 0, createdAt: serverTimestamp() });
        showToast('Projet créé ✓');
      }
      setModalOpen(false);
      setEditingProject(null);
    } catch (err) { console.error(err); showToast('Erreur: ' + err.message, 'error'); }
  };

  if (!authChecked) return <div className="loading-screen">
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Settings size={40} color="var(--accent-color)" /></motion.div>
  </div>;

  if (!currentUser) return <LoginPage />;

  if (loading) return <div className="loading-screen">
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Settings size={40} color="var(--accent-color)" /></motion.div>
  </div>;

  return (
    <Router>
      <div className={`app-container ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} t={t} currentUser={currentUser} financialData={financialData} />
        
        <div className="content-wrapper">
          <header className="main-header">
            <div className="header-left">
              <button onClick={() => setIsSidebarOpen(true)} className="mobile-menu-btn"><Menu size={24} /></button>
              <img src={logo} alt="Logo" className="header-logo" style={{ height: '55px', width: 'auto', marginRight: '15px', display: 'none' }} />
              <h1 className="header-title">Baridcash Janati</h1>
            </div>
            <div className="header-right">
              <span className="user-name-badge">{currentUser.name}</span>
              {currentUser.role === 'admin' && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAdminPanel(true)} title="Gestion Utilisateurs">
                  <UserCog size={15} />
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={handleLogout} title="Se déconnecter">
                <LogOut size={15} />
              </button>
              <div className="header-divider" />
              <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle Theme">
                {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              </button>
              <LangToggle lang={lang} setLang={setLang} />
            </div>
          </header>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<ProjectsView projects={projects} t={t} setPassModal={setPassModal} currentUser={currentUser} financialData={financialData} onAdd={() => { setEditingProject(null); setModalOpen(true); }} onEdit={(p) => { setEditingProject(p); setModalOpen(true); }} />} />
              <Route path="/project/:id" element={<ProjectDetails projects={projects} t={t} setPassModal={setPassModal} currentUser={currentUser} onEdit={(p) => { setEditingProject(p); setModalOpen(true); }} />} />
              <Route path="/dashboard" element={<Dashboard t={t} setPassModal={setPassModal} currentUser={currentUser} financialData={financialData} />} />
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
          {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
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

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen, isCollapsed, setIsCollapsed, t, currentUser, financialData = {} }) => {
  const location = useLocation();
  const nav = useNavigate();
  const { servicesTotal: dailyTotal = 0, monthlyTotal = 0 } = financialData;

  const menuItems = [
    { path: '/', icon: Layout, label: t.projects },
    { path: '/dashboard', icon: BarChart3, label: t.dashboard }
  ];
  return (
    <>
      <div className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <img src={logo} alt="Logo" style={{ height: '55px', width: 'auto', marginRight: !isCollapsed ? '8px' : '0' }} />
          {!isCollapsed && <span>Baridcash Janati</span>}
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
        {!isCollapsed && currentUser?.role === 'admin' && (
          <div className="sidebar-finance">
            <div className="sidebar-finance-title">Résumé Financier</div>
            <div className="sidebar-finance-row">
              <span className="sf-label">↑ Entrées (Jour)</span>
              <span className="sf-value in">{dailyTotal.toLocaleString()} DH</span>
            </div>
            <div className="sidebar-finance-row">
              <span className="sf-label">↑ Entrées (Mois)</span>
              <span className="sf-value month">{monthlyTotal.toLocaleString()} DH</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

function ProjectsView({ projects, t, onAdd, onEdit, setPassModal, currentUser, financialData = {} }) {
  const [tasks, setTasks] = useState([]);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [demandes, setDemandes] = useState([]);
  const [showDemandesModal, setShowDemandesModal] = useState(false);
  const [settings, setSettings] = useState({ monthly_target: 10000, daily_target: 500 });

  const { servicesTotal = 0, monthlyTotal = 0 } = financialData;

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, "global_tasks"), snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubDemandes = onSnapshot(collection(db, "demandes"), snap => {
      setDemandes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), docSnap => {
      if(docSnap.exists()) setSettings(docSnap.data());
    });
    return () => { unsubTasks(); unsubDemandes(); unsubSettings(); };
  }, []);

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const pendingDemandes = demandes.filter(d => !d.completed).length;
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

      <div className={`stats-grid ${currentUser?.role === 'admin' ? 'stats-grid-4' : 'stats-grid-2'}`} style={{ marginBottom: '32px' }}>
        {/* Card 1 — Tâches */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #ef4444', cursor: 'pointer' }} onClick={() => setShowTasksModal(true)}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tâches</span>
            <CheckCircle2 size={16} color="#ef4444" />
          </div>
          <div className="stat-value" style={{ color: pendingTasks > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {pendingTasks} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>En attente</span>
          </div>
        </div>

        {/* Card 2 — Les Demandes */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }} onClick={() => setShowDemandesModal(true)}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Les Demandes</span>
            <Inbox size={16} color="#8b5cf6" />
          </div>
          <div className="stat-value" style={{ color: pendingDemandes > 0 ? '#8b5cf6' : 'var(--text-primary)' }}>
            {pendingDemandes} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>En attente</span>
          </div>
        </div>

        {/* Card 3 — Revenu du Jour (admin only) */}
        {currentUser?.role === 'admin' && (
          <div className="card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Revenu du Jour</span>
              <TrendingUp size={16} color="#10b981" />
            </div>
            <div className="stat-value">{servicesTotal.toLocaleString()} <span className="currency">DH</span></div>
            <div className="progress-bg" style={{ marginTop: '10px' }}>
              <div className="progress-fill" style={{ width: `${progressDaily}%`, background: '#10b981' }}></div>
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px', color: 'var(--text-secondary)' }}>{progressDaily}% de {settings.daily_target} DH</div>
          </div>
        )}

        {/* Card 4 — Revenu du Mois (admin only) */}
        {currentUser?.role === 'admin' && (
          <div className="card stat-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
            <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Revenu du Mois</span>
              <Target size={16} color="var(--accent-color)" />
            </div>
            <div className="stat-value">{monthlyTotal.toLocaleString()} <span className="currency">DH</span></div>
            <div className="progress-bg" style={{ marginTop: '10px' }}>
              <div className="progress-fill" style={{ width: `${progressMonthly}%`, background: 'var(--accent-color)' }}></div>
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px', color: 'var(--text-secondary)' }}>{progressMonthly}% de {settings.monthly_target} DH</div>
          </div>
        )}
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
          <TasksModal tasks={tasks} onClose={() => setShowTasksModal(false)} t={t} setPassModal={setPassModal} currentUser={currentUser} />
        )}
        {showDemandesModal && (
          <DemandesModal demandes={demandes} onClose={() => setShowDemandesModal(false)} t={t} setPassModal={setPassModal} currentUser={currentUser} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DemandesModal({ demandes, onClose, t, setPassModal, currentUser }) {
  const [newDemandeTitle, setNewDemandeTitle] = useState('');
  const handleAddDemande = async () => {
    if(!newDemandeTitle) return;
    await addDoc(collection(db, "demandes"), { title: newDemandeTitle, completed: false, createdAt: serverTimestamp(), created_by: currentUser?.name || 'Staff' });
    setNewDemandeTitle('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3>Les Demandes</h3>
          <button onClick={onClose} className="btn-icon-sm"><X /></button>
        </div>
        <div className="modal-body">
          <div className="task-list">
            {demandes.map(demande => (
              <div key={demande.id} className="task-row">
                <div className="task-main">
                  <div onClick={() => updateDoc(doc(db, "demandes", demande.id), { completed: !demande.completed })}
                    className={`checkbox ${demande.completed ? 'checked' : ''}`}>
                    {demande.completed && <Check size={14} color="white" />}
                  </div>
                  <span className={demande.completed ? 'completed' : ''}>
                    {demande.title}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({demande.created_by})</span>
                  </span>
                </div>
                <button className="btn-icon-danger" onClick={() => {
                  setPassModal({ 
                    show: true, 
                    onConfirm: () => deleteDoc(doc(db, "demandes", demande.id)) 
                  });
                }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="task-input-box" style={{ marginTop: '20px' }}>
            <input className="input-field" placeholder="Nouvelle demande..." value={newDemandeTitle} onChange={e => setNewDemandeTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDemande()} />
            <button className="btn btn-primary" onClick={handleAddDemande}><Plus size={18} /></button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TasksModal({ tasks, onClose, t, setPassModal, currentUser }) {
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
                {currentUser?.role === 'admin' && (
                  <button className="btn-icon-danger" onClick={() => {
                    setPassModal({ 
                      show: true, 
                      onConfirm: () => deleteDoc(doc(db, "global_tasks", task.id)) 
                    });
                  }}><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
          {currentUser?.role === 'admin' && (
            <div className="task-input-box" style={{ marginTop: '20px' }}>
              <input className="input-field" placeholder="Ajouter une tâche..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTask()} />
              <button className="btn btn-primary" onClick={handleAddTask}><Plus size={18} /></button>
            </div>
          )}
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

function ProjectDetails({ projects, t, onEdit, setPassModal, currentUser }) {
  const { id } = useParams();
  const nav = useNavigate();
  const project = projects.find(p => p.id === id);
  const [operations, setOperations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('ops');
  const [newOp, setNewOp] = useState({ date: format(new Date(), 'yyyy-MM-dd'), source: 'CGE', type: opTypes[0], matricule: '', client: false, client_name: '', missing: '', amount_ht: '', tva: '' });
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
    const ht = Number(newOp.amount_ht) || 0;
    const frais = Number(newOp.tva) || 0;
    // Require HT to be entered
    if (newOp.amount_ht === '' || isNaN(ht) || ht < 0) {
      alert('Entrez le Paiement Net (>= 0)');
      return;
    }
    try {
      await addDoc(collection(db, "operations"), {
        ...newOp, project_id: id, date: Timestamp.fromDate(new Date(newOp.date)),
        amount_ht: ht, tva: frais, client_name: newOp.client_name || '', created_by: currentUser?.name || 'Staff'
      });
      setNewOp({ date: format(new Date(), 'yyyy-MM-dd'), source: 'CGE', type: opTypes[0], matricule: '', client: false, client_name: '', missing: '', amount_ht: '', tva: '' });
    } catch (err) { console.error(err); alert('Erreur: ' + err.message); }
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

      <div className="tab-content">
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
                  <select className="input-field" value={newOp.source} onChange={e => {
                    const val = e.target.value;
                    let nextType = newOp.type;
                    if (val === 'Delivery') {
                      nextType = 'Autre ville';
                    } else if (newOp.source === 'Delivery') {
                      nextType = opTypes[0];
                    }
                    setNewOp({...newOp, source: val, type: nextType});
                  }}>
                    <option>CGE</option><option>PCE</option><option>La Caisse</option><option>Infraction</option><option>Delivery</option>
                  </select>
                </div>
                <div className="form-group-sm">
                  <label className="label">{t.type}</label>
                  <select className="input-field" value={newOp.type} onChange={e => setNewOp({...newOp, type: e.target.value})}>
                    {newOp.source === 'Delivery' ? (
                      <>
                        <option>Sur fes</option>
                        <option>Autre ville</option>
                      </>
                    ) : (
                      opTypes.map(o => <option key={o}>{o}</option>)
                    )}
                  </select>
                </div>
                <div className="form-group-sm">
                  <label className="label">{t.matricule}</label>
                  <input type="text" className="input-field" value={newOp.matricule} onChange={e => setNewOp({...newOp, matricule: e.target.value})} placeholder={t.matricule} />
                </div>
                <div className="form-group-sm">
                  <label className="label">{t.clientName}</label>
                  <input type="text" className="input-field" value={newOp.client_name} onChange={e => setNewOp({...newOp, client_name: e.target.value})} placeholder={t.clientName} />
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
                      <th>{t.clientName}</th>
                      <th>{t.client}</th>
                      <th>{t.missing}</th>
                      {currentUser?.role === 'admin' && (
                        <>
                          <th>Créé par</th>
                          <th>{t.ht}</th>
                          <th>{t.tva}</th>
                          <th>{t.ttc}</th>
                        </>
                      )}
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
                        <td className="td-center">{op.client_name || '--'}</td>
                        <td className="td-center">{op.client ? <Check size={16} color="#10b981" /> : <X size={16} color="#ef4444" />}</td>
                        <td className="td-missing">
                          <div className="missing-box">
                            <span>{op.missing || '--'}</span>
                            <button onClick={() => setEditingMissing({ id: op.id, text: op.missing || '' })} className="btn-icon-xs"><Edit2 size={11} /></button>
                          </div>
                        </td>
                        {currentUser?.role === 'admin' && (
                          <>
                            <td className="td-center"><span className="badge badge-role-employee" style={{ fontSize: '10px' }}>{op.created_by || '--'}</span></td>
                            <td className="td-amount">{Number(op.amount_ht || 0).toLocaleString()}</td>
                            <td className="td-amount">{Number(op.tva || 0).toLocaleString()}</td>
                            <td className="td-ttc">{(Number(op.amount_ht || 0) + Number(op.tva || 0)).toLocaleString()}</td>
                          </>
                        )}
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

function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee' });
  const [editPass, setEditPass] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const withSecondaryApp = async (fn) => {
    const key = 'sec_' + Date.now();
    const secApp = initializeApp(firebaseConfig, key);
    const secAuth = getAuth(secApp);
    try { return await fn(secAuth); }
    finally { try { await signOut(secAuth); } catch {} await deleteApp(secApp); }
  };

  const handleAdd = async () => {
    if (!newUser.name.trim() || !newUser.password.trim()) return;
    if (newUser.password.length < 6) { alert('Mot de passe minimum 6 caractères'); return; }
    setBusy(true);
    try {
      const email = newUser.email.trim() ? newUser.email.trim().toLowerCase() : nameToEmail(newUser.name);
      await withSecondaryApp(async (secAuth) => {
        const cred = await createUserWithEmailAndPassword(secAuth, email, newUser.password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: newUser.name.trim(), email, role: newUser.role,
          password: newUser.password, createdAt: serverTimestamp()
        });
      });
      setNewUser({ name: '', email: '', password: '', role: 'employee' });
    } catch (err) { alert('Erreur: ' + err.message); }
    finally { setBusy(false); }
  };

  const handleDelete = async (user) => {
    setBusy(true);
    try {
      await withSecondaryApp(async (secAuth) => {
        const cred = await fbSignIn(secAuth, user.email, user.password);
        await fbDeleteUser(cred.user);
      });
    } catch { /* Auth account might already be gone */ }
    await deleteDoc(doc(db, 'users', user.id));
    setBusy(false);
  };

  const handleSavePassword = async () => {
    if (!editPass?.newPassword?.trim()) return;
    setBusy(true);
    try {
      await withSecondaryApp(async (secAuth) => {
        const cred = await fbSignIn(secAuth, editPass.email, editPass.password);
        await updatePassword(cred.user, editPass.newPassword);
      });
      await updateDoc(doc(db, 'users', editPass.id), { password: editPass.newPassword });
      setEditPass(null);
    } catch (err) { alert('Erreur: ' + err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%' }}>
        <div className="modal-header">
          <h3>Gestion des Utilisateurs</h3>
          <button onClick={onClose} className="btn-icon-sm"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="admin-add-user">
            <input className="input-field" placeholder="Nom affiché" value={newUser.name}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })} disabled={busy} />
            <input type="email" className="input-field" placeholder="Email (optionnel)" value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })} disabled={busy} />
            <input type="password" className="input-field" placeholder="Mot de passe (6+ car.)" value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} disabled={busy} />
            <select className="input-field" value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })} disabled={busy}>
              <option value="employee">Employé</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn btn-primary" onClick={handleAdd} disabled={busy}>
              {busy ? '...' : <><Plus size={15} /> Ajouter</>}
            </button>
          </div>

          <div className="user-list">
            {users.map(user => (
              <div key={user.id} className="user-row">
                {editPass?.id === user.id ? (
                  <div className="user-edit-pass">
                    <span className="user-name">{user.name}</span>
                    <input type="password" className="input-field" placeholder="Nouveau mot de passe"
                      value={editPass.newPassword} autoFocus disabled={busy}
                      onChange={e => setEditPass({ ...editPass, newPassword: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleSavePassword()} />
                    <button className="btn btn-primary btn-sm" onClick={handleSavePassword} disabled={busy}><Check size={14} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditPass(null)} disabled={busy}><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div className="user-info">
                      <span className="user-name">{user.name}</span>
                      <span className={`badge badge-role-${user.role}`}>{user.role === 'admin' ? 'Admin' : 'Employé'}</span>
                    </div>
                    <div className="user-actions">
                      <button className="btn btn-secondary btn-sm" disabled={busy}
                        onClick={() => setEditPass({ id: user.id, email: user.email, password: user.password, newPassword: '' })}>
                        <Edit2 size={13} /> MDP
                      </button>
                      <button className="btn-icon-danger" disabled={busy}
                        onClick={() => handleDelete(user)}><Trash2 size={14} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default App;
