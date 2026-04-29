import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { Check, Trash2, Plus, X, Settings, Target, CheckCircle2, TrendingUp, BarChart } from 'lucide-react';

export default function Dashboard({ projects, t }) {
  const [tasks, setTasks] = useState([]);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  const [settings, setSettings] = useState({ monthly_target: 10000, daily_target: 500 });
  const [showSettings, setShowSettings] = useState(false);
  
  const [dailyEntries, setDailyEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({ date: format(new Date(), 'yyyy-MM-dd'), edp: 0, narsa: 0, radiif: 0, p2: 0, pm: 0, em: 0, wu: 0, ria: 0, mg: 0, revenue: 0 });
  
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);

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
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayEntry = entries.find(e => e.date === todayStr);
      setTodayTotal(todayEntry ? Number(todayEntry.revenue) : 0);
      
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
    await setDoc(doc(db, "settings", "global"), { monthly_target: Number(settings.monthly_target), daily_target: Number(settings.daily_target) });
    setShowSettings(false);
  };

  const handleAddEntry = async () => {
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
      revenue: Number(newEntry.revenue),
      createdAt: serverTimestamp()
    });
    setNewEntry({ date: format(new Date(), 'yyyy-MM-dd'), edp: 0, narsa: 0, radiif: 0, p2: 0, pm: 0, em: 0, wu: 0, ria: 0, mg: 0, revenue: 0 });
  };

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const progressDaily = Math.min((todayTotal / (settings.daily_target || 1)) * 100, 100).toFixed(1);
  const progressMonthly = Math.min((monthlyTotal / (settings.monthly_target || 1)) * 100, 100).toFixed(1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 className="page-title">{t.dashboard}</h2>
        <button className="btn btn-secondary" onClick={() => setShowSettings(true)}><Settings size={18} /> Paramètres Objectifs</button>
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

        {/* Card 2: Objectifs du Mois */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--accent-color)' }}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Objectifs du Mois</span>
            <Target size={16} color="var(--accent-color)" />
          </div>
          <div className="stat-value">{monthlyTotal.toLocaleString()} <span className="currency">DH</span></div>
          <div className="progress-bg" style={{ marginTop: '10px' }}>
            <div className="progress-fill" style={{ width: `${progressMonthly}%`, background: 'var(--accent-color)' }}></div>
          </div>
          <div style={{ fontSize: '12px', marginTop: '5px', color: 'var(--text-secondary)' }}>{progressMonthly}% de {settings.monthly_target} DH</div>
        </div>

        {/* Card 3: Objectif Journalier */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Objectif Journalier</span>
            <TrendingUp size={16} color="#10b981" />
          </div>
          <div className="stat-value">{todayTotal.toLocaleString()} <span className="currency">DH</span></div>
          <div className="progress-bg" style={{ marginTop: '10px' }}>
            <div className="progress-fill" style={{ width: `${progressDaily}%`, background: '#10b981' }}></div>
          </div>
          <div style={{ fontSize: '12px', marginTop: '5px', color: 'var(--text-secondary)' }}>{progressDaily}% de {settings.daily_target} DH</div>
        </div>

        {/* Card 4: Total Projets */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Projets</span>
            <BarChart size={16} color="#8b5cf6" />
          </div>
          <div className="stat-value">{projects.length} <span className="currency">Projets</span></div>
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr className="input-row">
                  <td><input type="date" className="input-sm" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} /></td>
                  <td><input type="number" className="input-sm" value={newEntry.edp} onChange={e => setNewEntry({...newEntry, edp: e.target.value})} /></td>
                  <td><input type="number" className="input-sm" value={newEntry.narsa} onChange={e => setNewEntry({...newEntry, narsa: e.target.value})} /></td>
                  <td><input type="number" className="input-sm" value={newEntry.radiif} onChange={e => setNewEntry({...newEntry, radiif: e.target.value})} /></td>
                  <td><input type="number" className="input-sm" value={newEntry.p2} onChange={e => setNewEntry({...newEntry, p2: e.target.value})} /></td>
                  <td><input type="number" className="input-sm" value={newEntry.pm} onChange={e => setNewEntry({...newEntry, pm: e.target.value})} /></td>
                  <td><input type="number" className="input-sm" value={newEntry.em} onChange={e => setNewEntry({...newEntry, em: e.target.value})} /></td>
                  <td><input type="number" className="input-sm" value={newEntry.wu} onChange={e => setNewEntry({...newEntry, wu: e.target.value})} /></td>
                  <td><input type="number" className="input-sm" value={newEntry.ria} onChange={e => setNewEntry({...newEntry, ria: e.target.value})} /></td>
                  <td><input type="number" className="input-sm" value={newEntry.mg} onChange={e => setNewEntry({...newEntry, mg: e.target.value})} /></td>
                  <td><input type="number" className="input-sm" value={newEntry.revenue} onChange={e => setNewEntry({...newEntry, revenue: e.target.value})} style={{ fontWeight: 'bold', color: 'var(--accent-color)' }} /></td>
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
                    <td><button className="btn-icon-danger" onClick={() => deleteDoc(doc(db, "daily_goals", entry.id))}><Trash2 size={14} /></button></td>
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
                      <button className="btn-icon-danger" onClick={() => deleteDoc(doc(db, "global_tasks", task.id))}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <div className="task-input-box" style={{ marginTop: '20px' }}>
                  <input className="input-field" placeholder="Nouvelle tâche..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddTask()} />
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
