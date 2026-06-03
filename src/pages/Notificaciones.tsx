import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types/Product';
import styles from './Notificaciones.module.css';

interface Notificacion {
  id: string;
  titulo: string;
  descripcion: string;
  detectadaEn: string;
  leida: boolean;
  producto: Product;
}

type Filtro = 'todas' | 'leidas' | 'no-leidas';

const READ_KEY = 'notif_read';
const DETECTED_KEY = 'notif_detected';
const COUNT_KEY = 'notif_unread_count';

function getLeidas(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function getFechasDeteccion(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DETECTED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function guardarLeidas(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

function guardarFechasDeteccion(fechas: Record<string, string>) {
  localStorage.setItem(DETECTED_KEY, JSON.stringify(fechas));
}

function actualizarContador(notificaciones: Notificacion[]) {
  const noLeidas = notificaciones.filter(n => !n.leida).length;
  localStorage.setItem(COUNT_KEY, String(noLeidas));
  window.dispatchEvent(new CustomEvent('notif_update', { detail: { unread: noLeidas } }));
}

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        console.log('Cargando productos para notificaciones...');
        const snapshot = await getDocs(collection(db, 'products'));
        console.log('Productos encontrados:', snapshot.docs.length);
        const productos = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Producto:', doc.id, data);
          return {
            id: doc.id,
            ...data,
          };
        }) as unknown as Product[];

        console.log('Total de productos:', productos.length);
        const productosAlerta = productos.filter(
          p => p.refill && p.stock <= (p.stock_min ?? 0)
        );
        console.log('Productos con alerta:', productosAlerta.length, productosAlerta);

        const leidas = getLeidas();
        const fechas = getFechasDeteccion();
        const ahora = new Date().toISOString();
        let fechasCambiadas = false;

        const notifs: Notificacion[] = productosAlerta.map(producto => {
          if (!fechas[producto.id]) {
            fechas[producto.id] = ahora;
            fechasCambiadas = true;
          }
          return {
            id: producto.id,
            titulo: 'ALERTA PARA REABASTECER STOCK',
            descripcion: `El producto "${producto.name || producto.id}" requiere reabastecimiento. Stock actual: ${producto.stock} unidad${producto.stock !== 1 ? 'es' : ''}. Stock mínimo: ${producto.stock_min ?? 0} unidad${(producto.stock_min ?? 0) !== 1 ? 'es' : ''}.`,
            detectadaEn: fechas[producto.id],
            leida: leidas.has(producto.id),
            producto,
          };
        });

        if (fechasCambiadas) guardarFechasDeteccion(fechas);

        notifs.sort((a, b) => {
          if (a.leida !== b.leida) return a.leida ? 1 : -1;
          return new Date(b.detectadaEn).getTime() - new Date(a.detectadaEn).getTime();
        });

        setNotificaciones(notifs);
        actualizarContador(notifs);
      } catch (err) {
        console.error(err);
        setError('Error al cargar las notificaciones. Intenta de nuevo.');
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const marcarLeida = (id: string) => {
    const leidas = getLeidas();
    leidas.add(id);
    guardarLeidas(leidas);
    setNotificaciones(prev => {
      const actualizadas = prev.map(n => (n.id === id ? { ...n, leida: true } : n));
      actualizarContador(actualizadas);
      return actualizadas;
    });
  };

  const marcarTodasLeidas = () => {
    const leidas = getLeidas();
    notificaciones.forEach(n => leidas.add(n.id));
    guardarLeidas(leidas);
    setNotificaciones(prev => {
      const actualizadas = prev.map(n => ({ ...n, leida: true }));
      actualizarContador(actualizadas);
      return actualizadas;
    });
  };

  const filtradas = notificaciones.filter(n => {
    if (filtro === 'leidas') return n.leida;
    if (filtro === 'no-leidas') return !n.leida;
    return true;
  });

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.iconHeader}>
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
          </div>
          <h1 className={styles.title}>Notificaciones</h1>
          {noLeidas > 0 && (
            <span className={styles.badgeHeader}>{noLeidas} pendiente{noLeidas !== 1 ? 's' : ''}</span>
          )}
        </div>
        <p className={styles.subtitle}>Alertas de reabastecimiento de inventario</p>
      </div>

      {/* ── Barra de alertas destacada ── */}
      {!cargando && !error && noLeidas > 0 && (
        <div className={styles.alertaBanner}>
          <div className={styles.alertaBannerIcono}>⚠</div>
          <div className={styles.alertaBannerTexto}>
            <strong>ALERTA PARA REABASTECER STOCK</strong>
            <span>Tienes {noLeidas} producto{noLeidas !== 1 ? 's' : ''} con stock bajo que requiere{noLeidas !== 1 ? 'n' : ''} atención inmediata.</span>
          </div>
          <button className={styles.btnMarcarTodas} onClick={marcarTodasLeidas}>
            Marcar todas como leídas
          </button>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className={styles.filtros}>
        {(['todas', 'no-leidas', 'leidas'] as Filtro[]).map(f => (
          <button
            key={f}
            className={`${styles.filtroBt} ${filtro === f ? styles.filtroActivo : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f === 'todas' ? 'Todas' : f === 'no-leidas' ? 'No leídas' : 'Leídas'}
            {f === 'no-leidas' && noLeidas > 0 && (
              <span className={styles.filtroCont}>{noLeidas}</span>
            )}
            {f === 'todas' && (
              <span className={`${styles.filtroCont} ${filtro === f ? styles.filtroContActivo : ''}`}>
                {notificaciones.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Lista ── */}
      <div className={styles.lista}>
        {/* Estado: cargando */}
        {cargando && (
          <div className={styles.estadoBox}>
            <div className={styles.spinner} />
            <p>Cargando notificaciones...</p>
          </div>
        )}

        {/* Estado: error */}
        {!cargando && error && (
          <div className={`${styles.estadoBox} ${styles.errorBox}`}>
            <span className={styles.estadoIcono}>⚠</span>
            <p>{error}</p>
          </div>
        )}

        {/* Estado: vacío */}
        {!cargando && !error && filtradas.length === 0 && (
          <div className={styles.estadoBox}>
            <span className={styles.estadoIcono}>
              {filtro === 'leidas' ? '✓' : '🔔'}
            </span>
            <p>
              {filtro === 'todas'
                ? 'No hay alertas de stock en este momento.'
                : filtro === 'no-leidas'
                ? 'No tienes notificaciones sin leer.'
                : 'No tienes notificaciones leídas aún.'}
            </p>
          </div>
        )}

        {/* Tarjetas de notificación */}
        {!cargando &&
          !error &&
          filtradas.map(notif => (
            <div
              key={notif.id}
              className={`${styles.tarjeta} ${notif.leida ? styles.tarjetaLeida : styles.tarjetaNoLeida}`}
            >
              <div className={styles.tarjetaIzq}>
                <div className={`${styles.alertaIcono} ${notif.leida ? styles.alertaIconoLeido : ''}`}>
                  ⚠
                </div>
              </div>

              <div className={styles.tarjetaCuerpo}>
                <div className={styles.tarjetaEncabezado}>
                  <h3 className={styles.tarjetaTitulo}>{notif.titulo}</h3>
                  {!notif.leida && <span className={styles.punto} />}
                </div>
                <p className={styles.tarjetaDesc}>{notif.descripcion}</p>
                <div className={styles.tarjetaMeta}>
                  <span className={styles.tarjetaFecha}>{formatearFecha(notif.detectadaEn)}</span>
                  <span className={`${styles.estadoBadge} ${notif.leida ? styles.estadoLeido : styles.estadoNoLeido}`}>
                    {notif.leida ? 'Leída' : 'Sin leer'}
                  </span>
                </div>
              </div>

              {!notif.leida && (
                <button
                  className={styles.btnLeer}
                  onClick={() => marcarLeida(notif.id)}
                >
                  Marcar como leída
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

export default Notificaciones;
