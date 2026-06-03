import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail, createUserWithEmailAndPassword, getAuth, User } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { db, auth } from '../firebase';
import styles from './Users.module.css';

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  role: 'ventas' | 'admin' | 'gerente';
  active: boolean;
  createdAt: any;
}

const firebaseConfig = {
  apiKey: "AIzaSyBDPU5P7888UnZCwywtYBdiyQLgpKzc7zo",
  authDomain: "fir-ae52e.firebaseapp.com",
  projectId: "fir-ae52e",
  storageBucket: "fir-ae52e.firebasestorage.app",
  messagingSenderId: "325608837174",
  appId: "1:325608837174:web:240f9ed32233579a31c897"
};

const getSecondaryApp = () => {
  const existing = getApps().find(app => app.name === 'secondary');
  return existing || initializeApp(firebaseConfig, 'secondary');
};

const ROLE_COLORS: Record<string, string> = {
  gerente: '#E95A0C',
  admin: '#3b82f6',
  ventas: '#22c55e',
};

function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserData['role']>('admin');
  const [creating, setCreating] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  // For sync modal
  const [syncEmail, setSyncEmail] = useState('');
  const [syncName, setSyncName] = useState('');
  const [syncRole, setSyncRole] = useState<UserData['role']>('admin');
  const [syncing, setSyncing] = useState(false);

  const currentUid = auth.currentUser?.uid;

  const fetchUsers = async () => {
    try {
      console.log('Cargando usuarios desde Firestore...');
      const snap = await getDocs(collection(db, 'users'));
      console.log('Documentos encontrados:', snap.docs.length);
      const list: UserData[] = snap.docs.map(d => {
        console.log('Usuario:', d.id, d.data());
        return { uid: d.id, ...d.data() } as UserData;
      });
      // Gerente always first, then alphabetical
      list.sort((a, b) => {
        if (a.uid === currentUid) return -1;
        if (b.uid === currentUid) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
      console.log('Lista de usuarios procesada:', list);
      setUsers(list);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Auto-fix: Si el usuario actual es gerente@gmail.com pero tiene rol admin, actualizarlo
    const autoFixRole = async () => {
      if (auth.currentUser?.email === 'gerente@gmail.com') {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== 'gerente') {
            console.log('Auto-corrigiendo rol de gerente...');
            await updateDoc(doc(db, 'users', auth.currentUser.uid), { role: 'gerente' });
            localStorage.setItem('role', 'gerente');
            console.log('Rol actualizado a gerente');
            await fetchUsers();
          }
        }
      }
    };
    autoFixRole();
  }, []);

  const toggleActive = async (user: UserData) => {
    await updateDoc(doc(db, 'users', user.uid), { active: !user.active });
    setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, active: !u.active } : u));
  };

  const changeRole = async (uid: string, role: UserData['role']) => {
    await updateDoc(doc(db, 'users', uid), { role });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u));
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMsg(`Correo de restablecimiento enviado a ${email}`);
      setTimeout(() => setResetMsg(''), 4000);
    } catch {
      setResetMsg('Error al enviar el correo.');
      setTimeout(() => setResetMsg(''), 3000);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return;
    setCreating(true);
    try {
      const secondaryApp = getSecondaryApp();
      const secondaryAuth = getAuth(secondaryApp);
      const credential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      const newUid = credential.user.uid;
      await secondaryAuth.signOut();

      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        displayName: newName,
        email: newEmail,
        role: newRole,
        active: true,
        createdAt: Timestamp.now(),
      });

      setShowModal(false);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('admin');
      await fetchUsers();
    } catch (err: any) {
      alert('Error al crear usuario: ' + (err.message || err));
    } finally {
      setCreating(false);
    }
  };

  // Agregar usuario existente de Auth a Firestore manualmente
  const openAddExistingUser = () => {
    setShowSyncModal(true);
    setSyncEmail('');
    setSyncName('');
    setSyncRole('admin');
  };

  const handleAddExistingUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncEmail || !syncName) return;

    // Validar que sea uno de los emails permitidos o pedir confirmación
    const confirmMsg = `¿Deseas agregar a ${syncName} (${syncEmail}) con rol ${syncRole}?\n\nNOTA: Este usuario YA DEBE EXISTIR en Firebase Authentication. Si no existe, usa "Nuevo usuario" en su lugar.`;

    if (!window.confirm(confirmMsg)) return;

    setSyncing(true);
    try {
      // Usar un UID basado en el email para usuarios pre-existentes
      // Esto es temporal hasta que el usuario inicie sesión
      const derivedUid = 'legacy_' + syncEmail.replace(/[@.]/g, '_');

      // Verificar si ya existe
      const userDoc = await getDoc(doc(db, 'users', derivedUid));
      if (userDoc.exists()) {
        throw new Error('Este usuario ya fue agregado al sistema.');
      }

      await setDoc(doc(db, 'users', derivedUid), {
        uid: derivedUid,
        displayName: syncName,
        email: syncEmail,
        role: syncRole,
        active: true,
        createdAt: Timestamp.now(),
      });

      setShowSyncModal(false);
      setSyncEmail(''); setSyncName(''); setSyncRole('admin');
      setResetMsg(`Usuario ${syncEmail} agregado exitosamente`);
      setTimeout(() => setResetMsg(''), 4000);
      await fetchUsers();
    } catch (err: any) {
      alert('Error al agregar usuario: ' + (err.message || err));
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className={styles.container}>
      {/* Toast */}
      {resetMsg && <div className={styles.toast}>{resetMsg}</div>}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión de usuarios</h1>
          <p className={styles.subtitle}>Crea y administra los accesos al sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={styles.btnSync} onClick={openAddExistingUser}>
            + Agregar existente
          </button>
          <button className={styles.btnNew} onClick={() => setShowModal(true)}>
            + Nuevo usuario
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>USUARIO</th>
              <th>EMAIL</th>
              <th>ROL</th>
              <th>ESTADO</th>
              <th>REGISTRADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.empty}>No hay usuarios registrados.</td>
              </tr>
            )}
            {users.map(user => (
              <tr key={user.uid} className={!user.active ? styles.rowInactive : ''}>
                {/* Usuario */}
                <td>
                  <div className={styles.userCell}>
                    <div
                      className={styles.avatar}
                      style={{ background: ROLE_COLORS[user.role] || '#888' }}
                    >
                      {user.displayName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className={styles.userName}>{user.displayName}</span>
                  </div>
                </td>

                {/* Email */}
                <td className={styles.emailCell}>{user.email}</td>

                {/* Rol */}
                <td>
                  {user.uid === currentUid ? (
                    <div className={styles.roleFixed}>
                      <span className={`${styles.roleBadge} ${styles['role_' + user.role]}`}>
                        {user.role.toUpperCase()}
                      </span>
                      <span className={styles.youLabel}>(tú)</span>
                    </div>
                  ) : (
                    <select
                      className={styles.roleSelect}
                      value={user.role}
                      onChange={e => changeRole(user.uid, e.target.value as UserData['role'])}
                    >
                      <option value="ventas">ventas</option>
                      <option value="admin">admin</option>
                      <option value="gerente">gerente</option>
                    </select>
                  )}
                </td>

                {/* Estado */}
                <td>
                  <span className={`${styles.statusBadge} ${user.active ? styles.statusActive : styles.statusInactive}`}>
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>

                {/* Registrado */}
                <td className={styles.dateCell}>{formatDate(user.createdAt)}</td>

                {/* Acciones */}
                <td>
                  <div className={styles.actions}>
                    {user.uid !== currentUid && (
                      <button
                        className={user.active ? styles.btnDeactivate : styles.btnActivate}
                        onClick={() => toggleActive(user)}
                      >
                        {user.active ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                    <button className={styles.btnReset} onClick={() => resetPassword(user.email)}>
                      Reset pwd
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda de roles */}
      <div className={styles.legend}>
        <span className={styles.legendLabel}>Roles del sistema:</span>
        <span className={`${styles.roleBadge} ${styles.role_ventas}`}>VENTAS</span>
        <span className={styles.legendText}>Solo puede reportar ventas</span>
        <span className={styles.legendSep}>|</span>
        <span className={`${styles.roleBadge} ${styles.role_admin}`}>ADMIN</span>
        <span className={styles.legendText}>Acceso completo al sistema</span>
        <span className={styles.legendSep}>|</span>
        <span className={`${styles.roleBadge} ${styles.role_gerente}`}>GERENTE</span>
        <span className={styles.legendText}>Admin + gestión de usuarios</span>
      </div>

      {/* Modal nuevo usuario */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Nuevo usuario</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} className={styles.modalForm}>
              <div className={styles.fieldGroup}>
                <label>Nombre de usuario</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: Juan García"
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Rol</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value as UserData['role'])}>
                  <option value="ventas">Ventas — Solo reportar ventas</option>
                  <option value="admin">Admin — Acceso completo</option>
                  <option value="gerente">Gerente — Admin + usuarios</option>
                </select>
              </div>
              <button type="submit" className={styles.btnSubmit} disabled={creating}>
                {creating ? 'Creando...' : 'Crear usuario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal agregar usuario existente */}
      {showSyncModal && (
        <div className={styles.overlay} onClick={() => setShowSyncModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Agregar usuario existente</h2>
              <button className={styles.closeBtn} onClick={() => setShowSyncModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddExistingUser} className={styles.modalForm}>
              <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 12px' }}>
                Agrega un usuario que ya existe en Firebase Authentication pero no aparece en la tabla.
              </p>
              <div className={styles.fieldGroup}>
                <label>Email del usuario</label>
                <input
                  type="email"
                  value={syncEmail}
                  onChange={e => setSyncEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Nombre de usuario</label>
                <input
                  type="text"
                  value={syncName}
                  onChange={e => setSyncName(e.target.value)}
                  placeholder="Ej: Juan García"
                  required
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Rol</label>
                <select value={syncRole} onChange={e => setSyncRole(e.target.value as UserData['role'])}>
                  <option value="ventas">Ventas — Solo reportar ventas</option>
                  <option value="admin">Admin — Acceso completo</option>
                  <option value="gerente">Gerente — Admin + usuarios</option>
                </select>
              </div>
              <button type="submit" className={styles.btnSubmit} disabled={syncing}>
                {syncing ? 'Agregando...' : 'Agregar usuario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
