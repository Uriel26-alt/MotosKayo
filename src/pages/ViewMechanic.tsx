import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deleteDoc, doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './ViewProduct.module.css';
import mechanicStyles from './ViewMechanic.module.css';
import Swal from 'sweetalert2';
import { Mechanic } from '../types/Mechanic';
import { Service } from '../types/Service';

function ViewMechanic() {
    const { id } = useParams<{ id: string }>();
    const [mechanic, setMechanic] = useState<Mechanic | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMechanic = async () => {
        if (!id) return;
        try {
            const docRef = doc(db, 'mechanics', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setMechanic({ id: docSnap.id, ...docSnap.data() } as Mechanic);
            }
        } catch (error) {
            console.error('Error al obtener el mecanico:', error);
        }
    };

    const fetchMechanicServices = async () => {
        if (!id) return;
        try {
            const q = query(collection(db, 'services'), where('mechanic', '==', id));
            const querySnapshot = await getDocs(q);
            const servicesData: Service[] = [];
            querySnapshot.forEach((d) => {
                servicesData.push({ id: d.id, ...d.data() } as Service);
            });
            setServices(servicesData);
        } catch (error) {
            console.error('Error al obtener servicios del mecánico:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        // Validar que sea imagen
        if (!file.type.startsWith('image/')) {
            Swal.fire('Error', 'Por favor selecciona una imagen válida (JPG, PNG, etc.)', 'error');
            return;
        }

        // Validar tamaño (máximo 500KB)
        if (file.size > 500 * 1024) {
            Swal.fire('Error', 'La imagen es muy grande. Por favor selecciona una imagen menor a 500KB', 'error');
            return;
        }

        setUploading(true);

        // Leer y convertir imagen a Base64
        const reader = new FileReader();

        reader.onload = async (event) => {
            const base64String = event.target?.result as string;
            try {
                await updateDoc(doc(db, 'mechanics', id), { photoUrl: base64String });
                setMechanic(prev => prev ? { ...prev, photoUrl: base64String } : prev);
                Swal.fire('Éxito', 'Foto actualizada correctamente', 'success');
            } catch (error) {
                console.error('Error al actualizar foto:', error);
                Swal.fire('Error', 'No se pudo actualizar la foto', 'error');
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.onerror = () => {
            Swal.fire('Error', 'Error al leer la imagen', 'error');
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };

        reader.readAsDataURL(file);
    };

    const handleDelete = async () => {
        try {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: '¡Este mecanico será eliminado permanentemente!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });
            if (result.isConfirmed) {
                if (!id) return;
                await deleteDoc(doc(db, 'mechanics', id));
                Swal.fire('Eliminado!', 'El mecanico ha sido eliminado.', 'success');
                window.location.href = '/mecanicos';
            }
        } catch (error) {
            console.error('Error al eliminar el mecanico:', error);
            Swal.fire('Error', 'Hubo un problema al eliminar el mecanico', 'error');
        }
    };

    useEffect(() => {
        const loadData = async () => {
            await fetchMechanic();
            await fetchMechanicServices();
        };
        loadData();
    }, [id]);

    if (loading) return <div>Cargando...</div>;
    if (!mechanic) return <div>Mecánico no encontrado</div>;

    return (
        <div className={styles.containerViewProduct}>
            <div className={styles.headerViewProduct}>
                <Link to="/mecanicos">
                    <button className={styles.buttonInventory}>
                        <img src="/images/_-.png" alt="Volver" className={styles.iconoBoton} />
                        Volver
                    </button>
                </Link>
                <h1 className={styles.titleViewProduct}>{mechanic.fullName}</h1>
                <div className={styles.botonesViewProduct}>
                    <Link to={`/mecanicos/form/${mechanic.id}`}>
                        <button className={styles.buttonViewProduct}>Editar</button>
                    </Link>
                    <button className={styles.DeleteProduct} onClick={handleDelete}>
                        Eliminar
                    </button>
                </div>
            </div>

            <div className={styles.productInfo}>
                {/* Panel de foto */}
                <div className={styles.productImageContainer}>
                    <p>Foto</p>
                    {mechanic.photoUrl ? (
                        <img
                            src={mechanic.photoUrl}
                            alt={mechanic.fullName}
                            className={mechanicStyles.mechanicPhoto}
                        />
                    ) : (
                        <div className={mechanicStyles.photoPlaceholder}>
                            <svg viewBox="0 0 24 24" fill="currentColor" className={mechanicStyles.photoPlaceholderIcon}>
                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                            </svg>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handlePhotoUpload}
                    />
                    <button
                        className={mechanicStyles.uploadBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? 'Subiendo...' : mechanic.photoUrl ? 'Cambiar foto' : 'Agregar foto'}
                    </button>
                </div>

                {/* Panel de detalles */}
                <div className={styles.productDetails}>
                    <div className={styles.detailRow}>
                        <span className={styles.label}>Nombre del mecánico:</span>
                        <span className={styles.value}>{mechanic.fullName}</span>
                    </div>
                    <div className={styles.detailRow}>
                        <span className={styles.label}>Salario:</span>
                        <span className={styles.value}>${mechanic.salary}</span>
                    </div>
                    <div className={styles.detailRow}>
                        <span className={styles.label}>Estado:</span>
                        <span className={`${mechanicStyles.statusBadge} ${mechanic.active ? mechanicStyles.active : mechanicStyles.inactive}`}>
                            {mechanic.active ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                </div>
            </div>

            <h2 className={styles.sectionTitle}>Servicios realizados</h2>
            {services.length > 0 ? (
                <table className={styles.servicesTable}>
                    <thead>
                        <tr>
                            <th>Tipo de servicio</th>
                            <th>Descripción del problema</th>
                            <th>Total</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map((service) => (
                            <tr key={service.id}>
                                <td>{service.serviceType}</td>
                                <td>{service.problemDescription}</td>
                                <td>${service.totalCost.toFixed(2)}</td>
                                <td>
                                    <Link to={`/ViewService/${service.id}`}>
                                        <button className={styles.viewButton}>Ver servicio</button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className={styles.noServices}>Este mecánico no tiene servicios registrados</p>
            )}
        </div>
    );
}

export default ViewMechanic;
