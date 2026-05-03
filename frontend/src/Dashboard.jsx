import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, addDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
// financialData (servicesTotal, monthlyTotal, fraisByDate) comes from App-level listener via props
import { format } from 'date-fns';
import { Check, Trash2, Plus, X, Settings, Target, CheckCircle2, TrendingUp, Inbox } from 'lucide-react';

export default function Dashboard({ t, setPassModal, currentUser, financialData = {} }) {
  const [tasks, setTasks] = useState([]);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [demandes, setDemandes] = useState([]);
  const [showDemandesModal, setShowDemandesModal] = useState(false);
  const [newDemandeTitle, setNewDemandeTitle] = useState('');

  const [settings, setSettings] = useState({ monthly_target: 10000, daily_target: 500, app_password: '1234' });
  const [showSettings, setShowSettings] = useState(false);

  const [dailyEntries, setDailyEntries] = useState([]);
  const serviceFields = ['edp','narsa','radiif','p2','pm','em','wu','ria','mg'];
  const emptyIncrement = Object.fromEntries(serviceFields.map(f => [f, '']));
  const [increment, setIncrement] = useState({...emptyIncrement});

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayEntry = dailyEntries.find(e => e.date === todayStr);

  const { servicesTotal = 0, monthlyTotal = 0, fraisByDate = {} } = financialData;

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

    // Demandes
    const unsubDemandes = onSnapshot(collection(db, "demandes"), snap => {
      setDemandes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });

    // Daily Entries - pour afficher le tableau Smart Goals uniquement
    const unsubDaily = onSnapshot(query(collection(db, "daily_goals"), orderBy("date", "desc")), snap => {
      setDailyEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubTasks(); unsubSettings(); unsubDaily(); unsubDemandes(); };
  }, []);

  const handleAddTask = async () => {
    if(!newTaskTitle) return;
    await addDoc(collection(db, "global_tasks"), { title: newTaskTitle, completed: false, createdAt: serverTimestamp() });
    setNewTaskTitle('');
  };

  const handleAddDemande = async () => {
    if(!newDemandeTitle) return;
    await addDoc(collection(db, "demandes"), { title: newDemandeTitle, completed: false, createdAt: serverTimestamp(), created_by: currentUser?.name || 'Staff' });
    setNewDemandeTitle('');
  };

  const handleSaveSettings = async () => {
    await setDoc(doc(db, "settings", "global"), { 
      monthly_target: Number(settings.monthly_target), 
      daily_target: Number(settings.daily_target),
      app_password: settings.app_password || '1234'
    });
    setShowSettings(false);
  };

  // Accumulator: adds increment values to today's single row
  const handleAccumulate = async () => {
    const hasValue = serviceFields.some(f => Number(increment[f]) > 0);
    if (!hasValue) return;

    if (todayEntry) {
      // Add to existing today row
      const updatedData = {};
      serviceFields.forEach(f => {
        updatedData[f] = Number(todayEntry[f] || 0) + Number(increment[f] || 0);
      });
      updatedData.revenue = serviceFields.reduce((sum, f) => sum + updatedData[f], 0);
      await updateDoc(doc(db, "daily_goals", todayEntry.id), updatedData);
    } else {
      // Create today's row
      const data = {};
      serviceFields.forEach(f => { data[f] = Number(increment[f] || 0); });
      data.revenue = serviceFields.reduce((sum, f) => sum + data[f], 0);
      data.date = todayStr;
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "daily_goals"), data);
    }
    // Reset increment inputs
    setIncrement({...emptyIncrement});
  };

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const pendingDemandes = demandes.filter(d => !d.completed).length;
  const progressDaily = Math.min((servicesTotal / (settings.daily_target || 1)) * 100, 100).toFixed(1);
  const progressMonthly = Math.min((monthlyTotal / (settings.monthly_target || 1)) * 100, 100).toFixed(1);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h2 className="page-title">{t.dashboard}</h2>
        {currentUser?.role === 'admin' && (
          <button className="btn btn-secondary" onClick={() => setShowSettings(true)}><Settings size={18} /> Paramètres</button>
        )}
      </div>

      <div className={`stats-grid ${currentUser?.role === 'admin' ? 'stats-grid-4' : 'stats-grid-2'}`}>
        {/* Card 1: Tâches */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #ef4444', cursor: 'pointer' }} onClick={() => setShowTasksModal(true)}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tâches</span>
            <CheckCircle2 size={16} color="#ef4444" />
          </div>
          <div className="stat-value" style={{ color: pendingTasks > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {pendingTasks} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>En attente</span>
          </div>
        </div>

        {/* Card 2: Les Demandes */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }} onClick={() => setShowDemandesModal(true)}>
          <div className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Les Demandes</span>
            <Inbox size={16} color="#8b5cf6" />
          </div>
          <div className="stat-value" style={{ color: pendingDemandes > 0 ? '#8b5cf6' : 'var(--text-primary)' }}>
            {pendingDemandes} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>En attente</span>
          </div>
        </div>

        {/* Card 3: Revenu du Jour (admin only) */}
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

        {/* Card 4: Revenu du Mois (admin only) */}
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

      {/* Smart Goals System — Accumulator Input */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Smart Goals — Entrée Journalière</h3>
          <span style={{ fontSize: '13px', color: 'var(--accent-color)', fontWeight: 600 }}>📅 {todayStr}</span>
        </div>
        <div className="card-body">

          {/* Accumulator Inputs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            {serviceFields.map(field => (
              <div key={field} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px', flex: 1 }}>
                <label style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em' }}>{field}</label>
                <input
                  type="number"
                  className="input-sm"
                  style={{ textAlign: 'center', width: '100%' }}
                  value={increment[field]}
                  onChange={e => setIncrement({...increment, [field]: e.target.value})}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => e.key === 'Enter' && handleAccumulate()}
                  min="0"
                  placeholder="0"
                />
              </div>
            ))}
            <button className="btn btn-primary btn-sm" style={{ height: '36px', minWidth: '44px' }} onClick={handleAccumulate}><Plus size={16} /></button>
          </div>

          {/* Today's Running Total */}
          {todayEntry && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', padding: '12px 14px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ width: '100%', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Aujourd'hui</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                  {serviceFields.reduce((s, f) => s + Number(todayEntry[f] || 0), 0)} entrées
                </span>
              </div>
              {serviceFields.map(f => (
                <div key={f} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '50px', flex: 1 }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{f}</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: Number(todayEntry[f] || 0) > 0 ? '#10b981' : 'var(--text-muted)' }}>{todayEntry[f] || 0}</span>
                </div>
              ))}
            </div>
          )}

          {/* History Table */}
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
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dailyEntries.map(entry => (
                  <tr key={entry.id} style={entry.date === todayStr ? { background: 'rgba(16,185,129,0.06)', fontWeight: 600 } : {}}>
                    <td className="td-date" style={entry.date === todayStr ? { color: '#10b981', fontWeight: 700 } : {}}>{entry.date}</td>
                    {serviceFields.map(f => (
                      <td key={f} className="td-center" style={Number(entry[f] || 0) > 0 ? { fontWeight: 600 } : { color: 'var(--text-muted)' }}>{entry[f] || 0}</td>
                    ))}
                    <td className="td-center" style={{ fontWeight: 700, color: 'var(--accent-color)' }}>
                      {serviceFields.reduce((s, f) => s + Number(entry[f] || 0), 0)}
                    </td>
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

        {/* Demandes Modal */}
        {showDemandesModal && (
          <div className="modal-overlay" onClick={() => setShowDemandesModal(false)}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h3>Les Demandes</h3>
                <button onClick={() => setShowDemandesModal(false)} className="btn-icon-sm"><X /></button>
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
