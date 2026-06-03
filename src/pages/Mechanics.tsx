import { useEffect, useState } from 'react';
import styles from './Mechanics.module.css';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { Mechanic } from '../types/Mechanic';

function Mechanics() {
    const [mechanics, setMechanics] = useState<Mechanic[]>([]);

    const getMechanics = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'mechanics'));
            const mechanicList: Mechanic[] = querySnapshot.docs.map((d) => ({
                id: d.id,
                fullName: d.data().fullName,
                salary: d.data().salary,
                active: d.data().active,
                photoUrl: d.data().photoUrl || '',
            }));
            setMechanics(mechanicList);
        } catch (error) {
            console.error('Error al obtener mecánicos:', error);
        }
    };

    const toggleActive = async (mechanic: Mechanic) => {
        try {
            await updateDoc(doc(db, 'mechanics', mechanic.id), { active: !mechanic.active });
            setMechanics(prev =>
                prev.map(m => m.id === mechanic.id ? { ...m, active: !m.active } : m)
            );
        } catch (error) {
            console.error('Error al actualizar mecánico:', error);
        }
    };

    useEffect(() => {
        getMechanics();
    }, []);

    const active = mechanics.filter(m => m.active);
    const inactive = mechanics.filter(m => !m.active);

    const MechanicCard = ({ mechanic }: { mechanic: Mechanic }) => (
        <div className={`${styles.card} ${mechanic.active ? styles.cardActive : styles.cardInactive}`}>
            <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                    {mechanic.photoUrl ? (
                        <img src={mechanic.photoUrl} alt={mechanic.fullName} className={styles.avatar} />
                    ) : (
                        <div className={styles.avatarPlaceholder}>
                            <svg viewBox="0 0 24 24" fill="currentColor" className={styles.avatarIcon}>
                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                            </svg>
                        </div>
                    )}
                    <div className={styles.cardInfo}>
                        <h3 className={styles.cardName}>{mechanic.fullName}</h3>
                        <span className={`${styles.badge} ${mechanic.active ? styles.badgeActive : styles.badgeInactive}`}>
                            {mechanic.active ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                </div>

                <div className={styles.salaryRow}>
                    <span className={styles.salaryLabel}>Salario</span>
                    <span className={styles.salaryAmount}>${mechanic.salary.toFixed(2)}</span>
                </div>

                <div className={styles.cardActions}>
                    <Link to={`/mecanicos/${mechanic.id}`} state={{ mechanic }}>
                        <button className={styles.btnProfile}>Ver perfil</button>
                    </Link>
                    <button
                        className={mechanic.active ? styles.btnDeactivate : styles.btnActivate}
                        onClick={() => toggleActive(mechanic)}
                    >
                        {mechanic.active ? 'Desactivar' : 'Activar'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={styles.containerMechanics}>
            <div className={styles.headerMechanics}>
                <div>
                    <h1 className={styles.titleMechanics}>Mecánicos</h1>
                    <p className={styles.subtitle}>
                        {active.length} activos · {inactive.length} inactivos
                    </p>
                </div>
                <Link to="/mecanicos/form">
                    <button className={styles.buttonMechanics}>
                        <img src="/images/Agregar.png" alt="Icono agregar" className={styles.iconoBoton} />
                        Agregar Mecánico
                    </button>
                </Link>
            </div>

            {active.length > 0 && (
                <div className={styles.grid}>
                    {active.map(m => <MechanicCard key={m.id} mechanic={m} />)}
                </div>
            )}

            {inactive.length > 0 && (
                <>
                    <div className={styles.divider} />
                    <div className={styles.grid}>
                        {inactive.map(m => <MechanicCard key={m.id} mechanic={m} />)}
                    </div>
                </>
            )}
        </div>
    );
}

export default Mechanics;
