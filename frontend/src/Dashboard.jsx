import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Check, Trash2, Plus, X, Settings, Target, CheckCircle2, TrendingUp } from 'lucide-react';

export default function Dashboard({ t, setPassModal }) {
  const [tasks, setTasks] = useState([]);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  const [settings, setSettings] = useState({ monthly_target: 10000, daily_target: 500, app_password: '1234' });
  const [showSettings, setShowSettings] = useState(false);
  
  const [dailyEntries, setDailyEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({ date: format(new Date(), 'yyyy-MM-dd'), edp: 0, narsa: 0, radiif: 0, p2: 0, pm: 0, em: 0, wu: 0, ria: 0, mg: 0, revenue: 0 });
  
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [servicesTotal, setServicesTotal] = useState(0);

  useEffect(() => {
    // Global Tasks
    const unsubTasks = onSnapshot(collection(db, "global_tasks"), snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });

    // Settings
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), docSnap => {
      if(docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setDoc(doc(db, "settings", "global"), { monthly_target: 10000, daily_target: 500 });
      }
    });

    // Daily Entries
    const unsubDaily = onSnapshot(query(collection(db, "daily_goals"), orderBy("date", "desc")), snap => {
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDailyEntries(entries);
      
      const serviceKeys = ['edp', 'narsa', 'radiif', 'p2', 'pm', 'em', 'wu', 'ria', 'mg'];
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayEntry = entries.find(e => e.date === todayStr);
      const todayServicesSum = todayEntry
        ? serviceKeys.reduce((sum, k) => sum + Number(todayEntry[k] || 0), 0)
        : 0;
      setServicesTotal(todayServicesSum);
      
      const currentMonth = format(new Date(), 'yyyy-MM');
      const mTotal = entries.filter(e => e.date.startsWith(currentMonth)).reduce((acc, curr) => acc + Number(curr.revenue), 0);
      setMonthlyTotal(mTotal);
    });

    return () => { unsubTasks(); unsubSettings(); unsubDaily(); };
  }, []);

  const handleAddTask = async () => {
    if(!newTaskTitle) return;
    await addDoc(collection(db, "global_tasks"), { title: newTaskTitle, completed: false, createdAt: serverTimestamp() });
    setNewTaskTitle('');
  };

  const handleSaveSettings = async () => {
    await setDoc(doc(db, "settings", "global"), { 
      monthly_target: Number(settings.monthly_target), 
      daily_target: Number(settings.daily_target),
      app_password: settings.app_password || '1234'
    });
    setShowSettings(false);
  };

  const handleAddEntry = async () => {
    // Logic: revenue is the sum of all services if not entered manually
    const totalRevenue = Number(newEntry.edp) + Number(newEntry.narsa) + Number(newEntry.radiif) + 
                         Number(newEntry.p2) + Number(newEntry.pm) + Number(newEntry.em) + 
                         Number(newEntry.wu) + Number(newEntry.ria) + Number(newEntry.mg);
    
    await addDoc(collection(db, "daily_goals"), {
      date: newEntry.date,
      edp: Number(newEntry.edp),
      narsa: Number(newEntry.narsa),
      radiif: Number(newEntry.radiif),
      p2: Number(newEntry.p2),
      pm: Number(newEntry.pm),
      em: Number(newEntry.em),
      wu: Number(newEntry.wu),
      ria: Number(newEntry.ria),
      mg: Number(newEntry.mg),
      revenue: totalRevenue || Number(newEntry.revenue),
      createdAt: serverTimestamp()
    });
    setNewEntry({ date: format(new Date(), 'yyyy-MM-dd'), edp: 0, narsa: 0, radiif: 0, p2: 0, pm: 0, em: 0, wu: 0, ria: 0, mg: 0, revenue: 0 });
  };

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const progressDaily = Math.min((servicesTotal / (settings.daily_target || 1)) * 100, 100).toFixed(1);
  const progressMonthly = Math.min((monthlyTotal / (settings.monthly_target || 1)) * 100, 100).toFixed(1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h2 className="page-title">{t.dashboard}</h2>
        <button className="btn btn-secondary" onClick={() => setShowSettings(true)}><Settings size={18} /> Paramètres</button>
      </div>

      <div className="stats-grid">
        {/* Card 1: Tasks */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #ef4444', cursor: 'pointer' }} onClick={() => setShowTasksModal(true)}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tâches (Tasks)</span>
            <CheckCircle2 size={16} color="#ef4444" />
          </div>
          <div className="stat-value" style={{ color: pendingTasks > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {pendingTasks} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>En attente</span>
          </div>
        </div>

        {/* Card 2: Objectif Journalier */}
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

        {/* Card 3: Objectifs du Mois */}
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

      {/* Smart Goals System - Daily Input */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3>Système d'Objectifs (Smart Goals) - Entrée Journalière</h3>
        </div>
        <div className="card-body">
          <div className="table-container scrollable">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>EDP</th>
                  <th>NARSA</th>
                  <th>RADIIF</th>
                  <th>P2</th>
                  <th>PM</th>
                  <th>EM</th>
                  <th>WU</th>
                  <th>RIA</th>
                  <th>MG</th>
                  <th>Montant Réalisé (DH)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="input-row">
                  <td><input type="date" className="input-sm" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} /></td>
                  {['edp','narsa','radiif','p2','pm','em','wu','ria','mg'].map(field => (
                    <td key={field}>
                      <input
                        type="number"
                        className="input-sm"
                        value={newEntry[field]}
                        onChange={e => setNewEntry({...newEntry, [field]: e.target.value})}
                        onFocus={e => e.target.select()}
                        onKeyDown={e => e.key === 'Enter' && handleAddEntry()}
                        min="0"
                      />
                    </td>
                  ))}
                  <td className="td-ttc" style={{fontWeight:'bold'}}>
                    {(['edp','narsa','radiif','p2','pm','em','wu','ria','mg'].reduce((sum, f) => sum + Number(newEntry[f] || 0), 0)).toLocaleString()} DH
                  </td>
                  <td><button className="btn btn-primary btn-sm" onClick={handleAddEntry}><Plus size={16} /></button></td>
                </tr>
                {dailyEntries.map(entry => (
                  <tr key={entry.id}>
                    <td className="td-date">{entry.date}</td>
                    <td className="td-center">{entry.edp}</td>
                    <td className="td-center">{entry.narsa}</td>
                    <td className="td-center">{entry.radiif}</td>
                    <td className="td-center">{entry.p2}</td>
                    <td className="td-center">{entry.pm}</td>
                    <td className="td-center">{entry.em}</td>
                    <td className="td-center">{entry.wu}</td>
                    <td className="td-center">{entry.ria}</td>
                    <td className="td-center">{entry.mg}</td>
                    <td className="td-amount td-ttc">{entry.revenue?.toLocaleString()} DH</td>
                    <td><button className="btn-icon-danger" onClick={() => {
                      setPassModal({
                        show: true,
                        onConfirm: () => deleteDoc(doc(db, "daily_goals", entry.id))
                      });
                    }}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tasks Modal */}
      <AnimatePresence>
        {showTasksModal && (
          <div className="modal-overlay" onClick={() => setShowTasksModal(false)}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>Liste des Tâches</h3>
                <button onClick={() => setShowTasksModal(false)} className="btn-icon-sm"><X /></button>
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
                  <input className="input-field" placeholder="Nouvelle tâche..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTask()} />
                  <button className="btn btn-primary" onClick={handleAddTask}><Plus size={18} /></button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3>Paramètres des Objectifs (Cibles)</h3>
                <button onClick={() => setShowSettings(false)} className="btn-icon-sm"><X /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Montant Cible Journalier (DH)</label>
                  <input type="number" className="input-field" value={settings.daily_target} onChange={e => setSettings({...settings, daily_target: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label">Montant Cible Mensuel (DH)</label>
                  <input type="number" className="input-field" value={settings.monthly_target} onChange={e => setSettings({...settings, monthly_target: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="label">Mot de passe de suppression</label>
                  <input type="text" className="input-field" value={settings.app_password || ''} onChange={e => setSettings({...settings, app_password: e.target.value})} placeholder="1234" />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleSaveSettings}>Enregistrer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
