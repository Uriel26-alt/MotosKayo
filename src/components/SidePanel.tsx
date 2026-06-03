import { NavLink, useLocation } from 'react-router-dom';
import styles from './SidePanel.module.css';
import { getAuth } from "firebase/auth";
import { useEffect, useState } from 'react';

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const auth = getAuth();
  const user = auth.currentUser;

  const isActiveInventario = ['/inventario', '/AddProduct', '/ViewProduct'].includes(currentPath);
  const isActiveServicios = ['/services', '/registerService', '/ViewService'].includes(currentPath);
  const [ventasUser, setVentasUser] = useState(true);
  const [gerenteUser, setGerenteUser] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hovered, setHovered] = useState<
    | null
    | 'ventas'
    | 'reportes'
    | 'inventario'
    | 'servicios'
    | 'movimientos'
    | 'mecanicos'
    | 'notificaciones'
    | 'users'
    | 'proyecciones'
  >(null);

  useEffect(() => {
    const role = localStorage.getItem("role");
    setVentasUser(role === "ventas");
    setGerenteUser(role === "gerente");
    if (role === "gerente") {
      const saved = localStorage.getItem('notif_unread_count');
      setUnreadCount(saved ? parseInt(saved, 10) : 0);
    }
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent) => setUnreadCount(e.detail.unread);
    window.addEventListener('notif_update', handler as EventListener);
    return () => window.removeEventListener('notif_update', handler as EventListener);
  }, []);

  const getIcon = (
    name: 'ventas' | 'movimientos' | 'mecanicos' | 'reportes' | 'inventario' | 'servicios',
    isActive: boolean,
    isHover: boolean
  ) => {
    const iconsNormal = {
      ventas: '/images/money.png',
      movimientos: '/images/restore.png',
      mecanicos: '/images/plumber.png',
      reportes: '/images/Grafica.png',
      inventario: '/images/Inventario.png',
      servicios: '/images/Herramientas.png',
    };
    const iconsDark = {
      ventas: '/images/moneyNegro.png',
      movimientos: '/images/history.png',
      mecanicos: '/images/plumberNegro.png',
      reportes: '/images/GraficaNegro.png',
      inventario: '/images/Inventarionegro.png',
      servicios: '/images/Herramientasnegro.png',
    };
    return iconsNormal[name];
  };

  if (gerenteUser) {
    return (
      <aside className={styles.sidebar}>
        <ul className={styles.menu}>
          {/* Notificaciones exclusiva del gerente */}
          <li
            onMouseEnter={() => setHovered('notificaciones')}
            onMouseLeave={() => setHovered(null)}
          >
            <NavLink
              to="/notificaciones"
              className={({ isActive }) =>
                `${styles.menuItem} ${styles.notificaciones} ${isActive ? styles.active : ''}`
              }
            >
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
              <span>Notificaciones</span>
              {unreadCount > 0 && (
                <span className={styles.badge}>{unreadCount}</span>
              )}
            </NavLink>
          </li>

          <li onMouseEnter={() => setHovered('reportes')} onMouseLeave={() => setHovered(null)}>
            <NavLink to="/ReportPage" className={({ isActive }) => `${styles.menuItem} ${styles.reportes} ${isActive ? styles.active : ''}`}>
              <img src={getIcon('reportes', currentPath === '/ReportPage', hovered === 'reportes')} alt="Icono gráfica" className={styles.icon} />
              <span>Reportes</span>
            </NavLink>
          </li>

          <li onMouseEnter={() => setHovered('proyecciones')} onMouseLeave={() => setHovered(null)}>
            <NavLink to="/proyecciones" className={({ isActive }) => `${styles.menuItem} ${styles.proyecciones} ${isActive ? styles.active : ''}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
                <circle cx="9" cy="9" r="1.5"/>
                <circle cx="9" cy="15" r="1.5"/>
                <path d="M16 8l-3 3 2 2 3-3-2-2z"/>
              </svg>
              <span>Proyecciones</span>
            </NavLink>
          </li>

          <li onMouseEnter={() => setHovered('inventario')} onMouseLeave={() => setHovered(null)}>
            <NavLink to="/inventario" className={() => `${styles.menuItem} ${styles.inventario} ${isActiveInventario ? styles.active : ''}`}>
              <img src={getIcon('inventario', isActiveInventario, hovered === 'inventario')} alt="Icono inventario" className={styles.icon} />
              <span>Inventario</span>
            </NavLink>
          </li>

          <li onMouseEnter={() => setHovered('servicios')} onMouseLeave={() => setHovered(null)}>
            <NavLink to="/services" className={() => `${styles.menuItem} ${styles.servicios} ${isActiveServicios ? styles.active : ''}`}>
              <img src={getIcon('servicios', isActiveServicios, hovered === 'servicios')} alt="Icono servicios" className={styles.icon} />
              <span>Servicios</span>
            </NavLink>
          </li>

          <li onMouseEnter={() => setHovered('ventas')} onMouseLeave={() => setHovered(null)}>
            <NavLink to="/Ventas" className={({ isActive }) => `${styles.menuItem} ${styles.ventas} ${isActive ? styles.active : ''}`}>
              <img src={getIcon('ventas', currentPath === '/Ventas', hovered === 'ventas')} alt="Icono ventas" className={styles.icon} />
              <span>Reportar venta</span>
            </NavLink>
          </li>

          <li onMouseEnter={() => setHovered('movimientos')} onMouseLeave={() => setHovered(null)}>
            <NavLink to="/movimientos" className={({ isActive }) => `${styles.menuItem} ${styles.movimientos} ${isActive ? styles.active : ''}`}>
              <img src={getIcon('movimientos', currentPath === '/movimientos', hovered === 'movimientos')} alt="Icono movimientos" className={styles.icon} />
              <span>Movimientos</span>
            </NavLink>
          </li>

          <li onMouseEnter={() => setHovered('mecanicos')} onMouseLeave={() => setHovered(null)}>
            <NavLink to="/mecanicos" className={({ isActive }) => `${styles.menuItem} ${styles.mecanicos} ${isActive ? styles.active : ''}`}>
              <img src={getIcon('mecanicos', currentPath === '/mecanicos', hovered === 'mecanicos')} alt="Icono mecanicos" className={styles.icon} />
              <span>Mecánicos</span>
            </NavLink>
          </li>

          <li onMouseEnter={() => setHovered('users')} onMouseLeave={() => setHovered(null)}>
            <NavLink to="/users" className={({ isActive }) => `${styles.menuItem} ${styles.mecanicos} ${isActive ? styles.active : ''}`}>
              <img src={hovered === 'users' || currentPath === '/users' ? '/images/users-dark.png' : '/images/users.png'} alt="Icono usuarios" className={styles.icon} />
              <span>Usuarios</span>
            </NavLink>
          </li>
        </ul>
      </aside>
    );
  }

  if (ventasUser) {
    const isActive = currentPath === '/Ventas';
    return (
      <aside className={styles.sidebar}>
        <ul className={styles.menu}>
          <li
            onMouseEnter={() => setHovered('ventas')}
            onMouseLeave={() => setHovered(null)}
          >
            <NavLink
              to="/Ventas"
              className={({ isActive }) => `${styles.menuItem} ${styles.ventas} ${isActive ? styles.active : ''}`}
            >
              <img src={getIcon('ventas', isActive, hovered === 'ventas')} alt="Icono ventas" className={styles.icon} />
              <span>Reportar venta</span>
            </NavLink>
          </li>
        </ul>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <ul className={styles.menu}>
        <li
          onMouseEnter={() => setHovered('reportes')}
          onMouseLeave={() => setHovered(null)}
        >
          <NavLink
            to="/ReportPage"
            className={({ isActive }) => `${styles.menuItem} ${styles.reportes} ${isActive ? styles.active : ''}`}
          >
            <img src={getIcon('reportes', currentPath === '/ReportPage', hovered === 'reportes')} alt="Icono gráfica" className={styles.icon} />
            <span>Reportes</span>
          </NavLink>
        </li>

        <li
          onMouseEnter={() => setHovered('proyecciones')}
          onMouseLeave={() => setHovered(null)}
        >
          <NavLink
            to="/proyecciones"
            className={({ isActive }) => `${styles.menuItem} ${styles.proyecciones} ${isActive ? styles.active : ''}`}
          >
            <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
              <circle cx="9" cy="9" r="1.5"/>
              <circle cx="9" cy="15" r="1.5"/>
              <path d="M16 8l-3 3 2 2 3-3-2-2z"/>
            </svg>
            <span>Proyecciones</span>
          </NavLink>
        </li>

        <li
          onMouseEnter={() => setHovered('inventario')}
          onMouseLeave={() => setHovered(null)}
        >
          <NavLink
            to="/inventario"
            className={() => `${styles.menuItem} ${styles.inventario} ${isActiveInventario ? styles.active : ''}`}
          >
            <img src={getIcon('inventario', isActiveInventario, hovered === 'inventario')} alt="Icono inventario" className={styles.icon} />
            <span>Inventario</span>
          </NavLink>
        </li>

        <li
          onMouseEnter={() => setHovered('servicios')}
          onMouseLeave={() => setHovered(null)}
        >
          <NavLink
            to="/services"
            className={() => `${styles.menuItem} ${styles.servicios} ${isActiveServicios ? styles.active : ''}`}
          >
            <img src={getIcon('servicios', isActiveServicios, hovered === 'servicios')} alt="Icono servicios" className={styles.icon} />
            <span>Servicios</span>
          </NavLink>
        </li>

        <li
          onMouseEnter={() => setHovered('ventas')}
          onMouseLeave={() => setHovered(null)}
        >
          <NavLink
            to="/Ventas"
            className={({ isActive }) => `${styles.menuItem} ${styles.ventas} ${isActive ? styles.active : ''}`}
          >
            <img src={getIcon('ventas', currentPath === '/Ventas', hovered === 'ventas')} alt="Icono ventas" className={styles.icon} />
            <span>Reportar venta</span>
          </NavLink>
        </li>

        <li
          onMouseEnter={() => setHovered('movimientos')}
          onMouseLeave={() => setHovered(null)}
        >
          <NavLink
            to="/movimientos"
            className={({ isActive }) => `${styles.menuItem} ${styles.movimientos} ${isActive ? styles.active : ''}`}
          >
            <img src={getIcon('movimientos', currentPath === '/movimientos', hovered === 'movimientos')} alt="Icono movimientos" className={styles.icon} />
            <span>Movimientos</span>
          </NavLink>
        </li>

        <li
          onMouseEnter={() => setHovered('mecanicos')}
          onMouseLeave={() => setHovered(null)}
        >
          <NavLink
            to="/mecanicos"
            className={({ isActive }) => `${styles.menuItem} ${styles.mecanicos} ${isActive ? styles.active : ''}`}
          >
            <img src={getIcon('mecanicos', currentPath === '/mecanicos', hovered === 'mecanicos')} alt="Icono mecanicos" className={styles.icon} />
            <span>Mecánicos</span>
          </NavLink>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
