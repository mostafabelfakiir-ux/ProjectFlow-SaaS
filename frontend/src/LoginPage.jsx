import { useState } from 'react';
import { motion } from 'framer-motion';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const nameToEmail = (name) =>
  `${name.trim().toLowerCase().replace(/\s+/g, '_')}@pf.app`;

// If input contains '@', use it directly (Gmail etc). Otherwise convert name → name@pf.app
export const toFirebaseEmail = (input) =>
  input.includes('@') ? input.trim().toLowerCase() : nameToEmail(input);

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [migrationUser, setMigrationUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) { setError('Remplissez tous les champs'); return; }
    setLoading(true);
    setError('');
    const email = nameToEmail(identifier);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (authErr) {
      const isNotFound = ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-email'].includes(authErr.code);

      if (authErr.code === 'auth/wrong-password') {
        setError('Mot de passe incorrect');
        setLoading(false);
        return;
      }

      if (isNotFound) {
        try {
          // Try migration from old Firestore format
          const nameVal = identifier.trim();
          let oldUser = null;
          const snap = await getDocs(query(
            collection(db, 'users'),
            where('name', '==', nameVal),
            where('password', '==', password)
          ));
          if (!snap.empty) oldUser = { docId: snap.docs[0].id, ...snap.docs[0].data() };

          if (oldUser) {
            try {
              const cred = await createUserWithEmailAndPassword(auth, email, password);
              await setDoc(doc(db, 'users', cred.user.uid), {
                name: oldUser.name || nameVal, email,
                role: oldUser.role || 'employee', password,
                createdAt: serverTimestamp()
              });
              return;
            } catch (createErr) {
              if (createErr.code === 'auth/weak-password') {
                setMigrationUser({ name: oldUser.name || nameVal, role: oldUser.role || 'employee', email });
                setLoading(false);
                return;
              }
              throw createErr;
            }
          }

          // First ever setup
          const allSnap = await getDocs(collection(db, 'users'));
          if (allSnap.empty) {
            if (password.length < 6) {
              setError('Mot de passe trop court — minimum 6 caractères');
              setLoading(false);
              return;
            }
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', cred.user.uid), {
              name: identifier.trim(),
              email, role: 'admin', password, createdAt: serverTimestamp()
            });
            return;
          }

          setError('Identifiant ou mot de passe incorrect');
        } catch {
          setError('Erreur de connexion. Réessayez.');
        }
      } else {
        setError('Erreur de connexion. Réessayez.');
      }
      setLoading(false);
    }
  };

  const handleMigration = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Minimum 6 caractères'); return; }
    setLoading(true);
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, migrationUser.email, newPassword);
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: migrationUser.name, email: migrationUser.email,
        role: migrationUser.role, password: newPassword,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      setError('Erreur: ' + err.message);
      setLoading(false);
    }
  };

  if (migrationUser) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card" style={{ width: '100%', maxWidth: '380px', padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div className="logo-box" style={{ margin: '0 auto 14px', width: '54px', height: '54px', fontSize: '20px', borderRadius: '14px' }}>PF</div>
            <h1 style={{ fontSize: '20px', fontWeight: '800' }}>Nouveau mot de passe</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
              Bonjour <strong>{migrationUser.name}</strong> — choisissez un nouveau mot de passe (min. 6 caractères).
            </p>
          </div>
          <form onSubmit={handleMigration}>
            <div className="form-group">
              <label className="label">Nouveau mot de passe</label>
              <input type="password" className="input-field" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" autoFocus autoComplete="new-password" />
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: '13px', margin: '10px 0', textAlign: 'center' }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px', padding: '12px' }} disabled={loading}>
              {loading ? 'Création...' : 'Confirmer'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card" style={{ width: '100%', maxWidth: '380px', padding: '36px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="logo-box" style={{ margin: '0 auto 14px', width: '54px', height: '54px', fontSize: '20px', borderRadius: '14px' }}>PF</div>
          <h1 style={{ fontSize: '22px', fontWeight: '800' }}>ProjectFlow</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Connectez-vous pour continuer</p>
        </div>
        <form onSubmit={handleLogin} autoComplete="off">
          <div className="form-group">
            <label className="label">Nom d'utilisateur</label>
            <input
              className="input-field"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="Votre nom"
              autoFocus
              autoComplete="off"
              name="pf-username"
            />
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="label">Mot de passe</label>
            <input type="password" className="input-field" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••"
              autoComplete="off" name="pf-password" />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '13px', margin: '10px 0', textAlign: 'center' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px', padding: '12px' }} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
