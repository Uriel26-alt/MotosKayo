import { useEffect, useState } from 'react';
import styles from './services.module.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { Service } from '../types/Service';
import { Mechanic } from '../types/Mechanic';

type Tab = 'en proceso' | 'finalizado';

function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [mechanics, setMechanics] = useState<Record<string, Mechanic>>({});
  const [tab, setTab] = useState<Tab>('en proceso');
  const [search, setSearch] = useState('');

  const getServices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'services'));
      const serviceList = querySnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Service[];
      setServices(serviceList);
    } catch (error) {
      console.error('Error al obtener servicios:', error);
    }
  };

  const getMechanics = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'mechanics'));
      const map: Record<string, Mechanic> = {};
      querySnapshot.forEach(d => {
        map[d.id] = { id: d.id, ...d.data() } as Mechanic;
      });
      setMechanics(map);
    } catch (error) {
      console.error('Error al obtener mecánicos:', error);
    }
  };

  useEffect(() => {
    getServices();
    getMechanics();
  }, []);

  const getMechanicName = (id: string) => mechanics[id]?.fullName || '—';

  const q = search.trim().toLowerCase();

  const filtered = services.filter(s => {
    const matchTab = tab === 'finalizado'
      ? s.status === 'finalizado'
      : s.status !== 'finalizado';

    if (!matchTab) return false;
    if (!q) return true;

    return (
      s.clientName?.toLowerCase().includes(q) ||
      s.motorcycle?.plates?.toLowerCase().includes(q) ||
      s.serviceType?.toLowerCase().includes(q)
    );
  });

  const totalEnProceso = services.filter(s => s.status !== 'finalizado').length;
  const totalFinalizado = services.filter(s => s.status === 'finalizado').length;

  return (
    <div className={styles.containerServices}>
      {/* Header */}
      <div className={styles.headerServices}>
        <div>
          <h1 className={styles.titleServices}>Servicios</h1>
          <p className={styles.subtitle}>
            {totalEnProceso} en proceso · {totalFinalizado} finalizados
          </p>
        </div>
        <Link to="/registerService">
          <button className={styles.buttonServices}>
            <img src="/images/Agregar.png" alt="Agregar" className={styles.iconoBoton} />
            Registrar servicio
          </button>
        </Link>
      </div>

      {/* Buscador */}
      <div className={styles.searchBox}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por cliente, placas o tipo de servicio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clearSearch} onClick={() => setSearch('')}>×</button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'en proceso' ? styles.tabActive : ''}`}
          onClick={() => setTab('en proceso')}
        >
          En proceso
          <span className={styles.tabBadge}>{totalEnProceso}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'finalizado' ? styles.tabActive : ''}`}
          onClick={() => setTab('finalizado')}
        >
          Finalizados
          <span className={styles.tabBadge}>{totalFinalizado}</span>
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{search ? 'No se encontraron servicios con esa búsqueda.' : `No hay servicios ${tab === 'finalizado' ? 'finalizados' : 'en proceso'}.`}</p>
        </div>
      ) : (
        <div className={styles.servicesGrid}>
          {filtered.map(service => (
            <div
              key={service.id}
              className={`${styles.serviceCard} ${service.status === 'finalizado' ? styles.cardFinalizado : styles.cardEnProceso}`}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{service.serviceType}</h3>
                <span className={`${styles.statusBadge} ${service.status === 'finalizado' ? styles.badgeFinalizado : styles.badgeEnProceso}`}>
                  {service.status === 'finalizado' ? 'Finalizado' : 'En proceso'}
                </span>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Cliente</span>
                  <span className={styles.value}>{service.clientName}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Moto</span>
                  <span className={styles.value}>
                    {service.motorcycle.brand} {service.motorcycle.model} {service.motorcycle.year}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Placas</span>
                  <span className={styles.value}>{service.motorcycle.plates}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Mecánico</span>
                  <span className={styles.value}>{getMechanicName(service.mechanic)}</span>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.totalCost}>
                  <span className={styles.costLabel}>Total</span>
                  <span className={styles.costValue}>${service.totalCost?.toFixed(2) ?? '0.00'}</span>
                </div>
                <Link to={`/ViewService/${service.id}`}>
                  <button className={styles.viewBtn}>
                    <img src="/images/ojo-svgrepo-com.svg" alt="Ver" className={styles.iconImage} />
                    Ver detalles
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Services;
