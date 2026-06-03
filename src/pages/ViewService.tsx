import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './ViewService.module.css';
import { Service } from '../types/Service';
import { Mechanic } from '../types/Mechanic';
import Swal from 'sweetalert2';

function ViewService() {
  const { id } = useParams();
  const [service, setService] = useState<Service | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) fetchService(id);
  }, [id]);

  const fetchService = async (serviceId: string) => {
    try {
      const docRef = doc(db, 'services', serviceId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const serviceData = { id: docSnap.id, ...docSnap.data() } as Service;
        setService(serviceData);

        if (serviceData.mechanic) {
          fetchMechanic(serviceData.mechanic);
        }

        if ((serviceData.products ?? []).length > 0) {
          fetchProducts((serviceData.products ?? []).map(item => item.productId));
        }
      } else {
        Swal.fire('Error', 'Servicio no encontrado', 'error');
      }
    } catch (error) {
      console.error('Error al cargar el servicio:', error);
      Swal.fire('Error', 'Hubo un error al cargar el servicio', 'error');
    }
  };

  const fetchMechanic = async (mechanicId: string) => {
    try {
      const mechanicSnap = await getDoc(doc(db, 'mechanics', mechanicId));
      if (mechanicSnap.exists()) {
        setMechanic({ id: mechanicSnap.id, ...mechanicSnap.data() } as Mechanic);
      }
    } catch (error) {
      console.error('Error al cargar el mecánico:', error);
    }
  };

  const fetchProducts = async (productIds: string[]) => {
    try {
      const productsList = await Promise.all(
        productIds.map(async (productId) => {
          const productSnap = await getDoc(doc(db, 'products', productId));
          return productSnap.exists() ? productSnap.data() : null;
        })
      );
      debugger
      setProducts(productsList.filter(Boolean));
    } catch (error) {
      console.error('Error al cargar los productos:', error);
      Swal.fire('Error', 'Hubo un error al cargar los productos', 'error');
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: '¿Eliminar servicio?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed && id) {
      try {
        await deleteDoc(doc(db, 'services', id));
        await Swal.fire('Eliminado', 'El servicio ha sido eliminado', 'success');
        navigate('/services');
      } catch (error) {
        console.error('Error al eliminar servicio:', error);
        Swal.fire('Error', 'No se pudo eliminar el servicio', 'error');
      }
    }
  };

  const handleFinish = async () => {
    const result = await Swal.fire({
      title: '¿Finalizar servicio?',
      text: "¿Estás seguro de marcar este servicio como finalizado?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed && id) {
      try {
        await updateDoc(doc(db, 'services', id), {
          status: 'finalizado',
          endDate: new Date().toISOString()
        });
        await Swal.fire('Finalizado', 'El servicio ha sido marcado como finalizado', 'success');
        fetchService(id);
      } catch (error) {
        console.error('Error al finalizar servicio:', error);
        Swal.fire('Error', 'No se pudo finalizar el servicio', 'error');
      }
    }
  };

  if (!service) return <div>Cargando...</div>;

  return (
    <div className={styles.containerViewService}>
      <div className={styles.headerViewService}>
        <Link to="/services">
          <button className={styles.buttonServices}>
            <img src="/images/_-.png" alt="Icono regresar" className={styles.iconoBoton} />
            Volver
          </button>
        </Link>
        <h1 className={styles.titleViewService}>
          Servicio {service.id} - {service.clientName}
        </h1>
        <div className={styles.botonesViewService}>
          {service.status !== 'finalizado' && (
            <button className={styles.finishService} onClick={handleFinish}>
              Finalizar servicio
            </button>
          )}
          <Link to={`/registerService/${service.id}`}>
            <button className={styles.buttonViewService}>Editar</button>
          </Link>
          <button className={styles.DeleteService} onClick={handleDelete}>
            Eliminar
          </button>
        </div>
      </div>

      <div className={styles.serviceInfo}>
        <div className={styles.serviceDetails}>
          <div className={styles.detailRow}>
            <span className={styles.label}>Nombre del cliente</span>
            <span className={styles.value}>{service.clientName}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Mecánico asignado:</span>
            <span className={styles.value}>{mechanic ? mechanic.fullName : 'Cargando...'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Servicio realizado</span>
            <span className={styles.value}>{service.serviceType}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Marca de la motocicleta</span>
            <span className={styles.value}>{service.motorcycle.brand}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Modelo de la motocicleta</span>
            <span className={styles.value}>{service.motorcycle.model}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Placas</span>
            <span className={styles.value}>{service.motorcycle.plates}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Descripción del problema</span>
            <span className={styles.value}>{service.problemDescription}</span>
          </div>
          {service.status === 'finalizado' && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Estado</span>
              <span className={styles.value}>Finalizado</span>
            </div>
          )}
        </div>

        <div className={styles.summaryContainer}>
          <div className={styles.summaryHeader}>
            <h2 className={styles.summaryTitle}>Productos utilizados</h2>
          </div>

          {products.length > 0 ? (
            products.map((product: any, index: number) => (
              <div key={index} className={styles.productRow}>
                <div className={styles.productInfo}>
                  <img src={product.image_url || '/images/default-product.jpg'} alt={product.name} loading='lazy' />
                  <span>{product.name}</span>
                </div>
                <div className={styles.price}>${product.price_buy.toFixed(2)}</div>
              </div>
            ))
          ) : (
            <p>No se han agregado productos al servicio.</p>
          )}

          <div className={styles.costosContainer}>
            <div className={styles.CostoS}>Costo del servicio: ${service.serviceCost.toFixed(2)}</div>
            <div className={styles.total}>Costo total: ${service.totalCost.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewService;