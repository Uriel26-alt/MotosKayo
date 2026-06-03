import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './RegisterService.module.css';
import { Product, SelectedProduct } from '../types/Product';
import { Service } from '../types/Service';
import { Mechanic } from '../types/Mechanic';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function RegisterService() {
  const [clientName, setClientName] = useState('');
  const [mechanic, setMechanic] = useState('');
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [serviceType, setServiceType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plates, setPlates] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const productsTotal = selectedProducts.reduce(
    (sum, item) => sum + (item.product.price_buy * item.quantity),
    0
  );
  const totalCost = parseFloat(serviceCost || '0') + productsTotal;

  useEffect(() => {
    fetchProducts();
    fetchMechanics();
    if (id) {
      fetchService(id);
    }
  }, [id]);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(productsData);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const fetchMechanics = async () => {
    try {
      const q = query(collection(db, 'mechanics'), where('active', '==', true));
      const querySnapshot = await getDocs(q);
      const mechanicsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Mechanic[];
      setMechanics(mechanicsData);
    } catch (error) {
      console.error('Error al cargar mecánicos:', error);
    }
  };

  const fetchService = async (serviceId: string) => {
    try {
      const docRef = doc(db, 'services', serviceId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const service = docSnap.data() as Service;
        setClientName(service.clientName);
        setMechanic(service.mechanic || '');
        setServiceType(service.serviceType);
        setBrand(service.motorcycle.brand);
        setModel(service.motorcycle.model);
        setYear(service.motorcycle.year);
        setPlates(service.motorcycle.plates);
        setProblemDescription(service.problemDescription);
        setServiceCost(service.serviceCost.toString());

        if (service.products && service.products.length > 0) {
          const productsWithData = await Promise.all(
            service.products.map(async (item) => {
              const productDoc = await getDoc(doc(db, 'products', item.productId));
              if (productDoc.exists()) {
                return {
                  product: { id: productDoc.id, ...productDoc.data() } as Product,
                  quantity: item.quantity || 1
                };
              }
              return null;
            })
          );
          setSelectedProducts(productsWithData.filter((item): item is SelectedProduct => item !== null));
        }
      }
    } catch (error) {
      console.error('Error al cargar servicio:', error);
    }
  };

  const handleAddProduct = (product: Product) => {
    const productExists = selectedProducts.find(p => p.product.id === product.id);
    if (!productExists) {
      setSelectedProducts([...selectedProducts, { product, quantity }]);
      setQuantity(1);
    }
    setShowProductModal(false);
  };

  const handleDeleteProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(item => item.product.id !== productId));
  };

  const handleServiceCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setServiceCost(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !mechanic || !serviceType || !brand || !model || !year || !plates || !problemDescription || !serviceCost) {
      alert('Por favor completa todos los campos');
      return;
    }

    const serviceCostParsed = parseFloat(serviceCost);

    try {
      const serviceData = {
        clientName,
        mechanic,
        serviceType,
        motorcycle: {
          brand,
          model,
          year,
          plates,
        },
        problemDescription,
        serviceCost: serviceCostParsed,
        products: selectedProducts.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        totalCost: totalCost,
      };

      if (id) {
        const serviceRef = doc(db, 'services', id);
        await updateDoc(serviceRef, serviceData);
        alert('Servicio actualizado exitosamente');
        generatePDF(serviceData, selectedProducts);
      } else {
        await addDoc(collection(db, 'services'), serviceData);
        alert('Servicio registrado exitosamente');
        generatePDF(serviceData, selectedProducts);
      }

      navigate('/services');
    } catch (error) {
      console.error('Error al guardar servicio:', error);
      alert('Hubo un error al guardar el servicio');
    }
  };

  const generatePDF = (serviceData: any, fullProducts: SelectedProduct[]) => {
const doc = new jsPDF();
const selectedMechanic = mechanics.find(m => m.id === serviceData.mechanic);

// Fondo claro encabezado
doc.setFillColor(240, 240, 240);
doc.rect(0, 0, 210, 45, 'F');

// Logo
const logoBase64 = 'images/Logo.png'; // Usa tu ruta base64 real si es necesario
doc.addImage(logoBase64, 'PNG', 10, 10, 35, 25);

// Texto junto al logo
doc.setFontSize(22);
doc.setFont('helvetica', 'bold');
doc.setTextColor(33, 37, 41);
doc.text('MotoTec', 55, 20);

doc.setFontSize(12);
doc.setFont('helvetica', 'normal');
doc.setTextColor(100);
doc.text('Comprobante de servicio', 55, 28);

// Línea divisoria
doc.setDrawColor(200);
doc.line(10, 45, 200, 45);

// Datos del servicio
doc.setFontSize(11);
doc.setTextColor(0);
doc.text(`Cliente: ${serviceData.clientName}`, 20, 55);
doc.text(`Mecánico: ${selectedMechanic ? selectedMechanic.fullName : ''}`, 20, 62);
doc.text(`Tipo de servicio: ${serviceData.serviceType}`, 20, 69);
doc.text(`Descripción del problema: ${serviceData.problemDescription}`, 20, 76);

doc.text(`Marca: ${serviceData.motorcycle.brand}`, 20, 83);
doc.text(`Modelo: ${serviceData.motorcycle.model}`, 20, 90);
doc.text(`Año: ${serviceData.motorcycle.year}`, 20, 97);
doc.text(`Placas: ${serviceData.motorcycle.plates}`, 20, 104);

// Tabla de productos usados
const headers = [['Producto', 'Cantidad', 'Precio']];
const data = fullProducts.map((item: any) => [
  item.product.name,
  item.quantity,
  `$${(item.product.price_buy * item.quantity).toFixed(2)}`
]);

autoTable(doc, {
  startY: 110,
  head: headers,
  body: data,
  theme: 'grid',
  headStyles: {
    fillColor: [33, 37, 41],
    textColor: 255,
    fontStyle: 'bold'
  },
  styles: {
    fontSize: 10,
    cellPadding: 2
  }
});

const finalY = (doc as any).lastAutoTable?.finalY || 110;

// Totales
doc.setFontSize(11);
doc.text(`Costo del servicio: $${serviceData.serviceCost.toFixed(2)}`, 20, finalY + 10);
doc.text(`Total: $${serviceData.totalCost.toFixed(2)}`, 20, finalY + 16);

// Footer
doc.setFontSize(10);
doc.setTextColor(100);
doc.text('Dirección: Carretera Puerto Ángel #123, San Juan Chilateca, Oaxaca', 20, finalY + 28);
doc.text('Tel: 951-873-37-95', 20, finalY + 33);

// Guardar
doc.save('ticket_servicio.pdf');

  };

  return (
    <div className={styles.containerRegisterService}>
      <div className={styles.headerRegisterService}>
        <h1 className={styles.titleRegisterService}>{id ? 'Editar Servicio' : 'Registrar Servicio'}</h1>
        <Link to="/services">
          <button className={styles.buttonService}>
            <img src="/images/_-.png" alt="Icono agregar" className={styles.iconoBoton} />
            Volver
          </button>
        </Link>
      </div>

      <form className={styles.formRegisterService} onSubmit={handleSubmit}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Información General</h2>
          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Nombre completo del cliente</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ej: Juan Pérez García" />
            </div>
            <div className={styles.inputGroup}>
              <label>Mecánico asignado</label>
              <select
                value={mechanic}
                onChange={(e) => setMechanic(e.target.value)}
                required
              >
                <option value="">Selecciona un mecánico</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Tipo de servicio realizado</label>
              <input type="text" value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Ej: Mantenimiento preventivo" />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Detalles de la Motocicleta</h2>
          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Marca</label>
              <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: Honda" />
            </div>
            <div className={styles.inputGroup}>
              <label>Modelo</label>
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ej: CBR 600RR" />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Año</label>
              <input type="number" min="0" value={year} onChange={e => { const v = parseInt(e.target.value); if (v >= 0 || e.target.value === "") setYear(e.target.value); }} placeholder="Ej: 2020" />
            </div>
            <div className={styles.inputGroup}>
              <label>Placas</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={plates}
                    onChange={e => {
                      let v = e.target.value.toUpperCase();
                      // Permitir solo letras, números y 1 guion máximo
                      if (/^[A-Z0-9-]{0,8}$/.test(v) && (v.split('-').length - 1) <= 1) {
                        setPlates(v);
                      }
                    }}
                    placeholder="Ej: ABC-1234"
                  />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Descripción del Servicio</h2>
          <div className={styles.inputGroup}>
            <label>Descripción del problema</label>
            <textarea rows={4} value={problemDescription} onChange={(e) => setProblemDescription(e.target.value)} placeholder="Describe detalladamente el problema o servicio solicitado..."></textarea>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Costo del servicio (mano de obra)</label>
              <input
                type="number"
                value={serviceCost}
                onChange={handleServiceCostChange}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className={styles.summaryContainer}>
          <div className={styles.summaryHeader}>
            <h2 className={styles.summaryTitle}>Productos utilizados en el servicio</h2>
            <button type="button" className={styles.addButton} onClick={() => setShowProductModal(true)}>Agregar producto</button>
          </div>

          {selectedProducts.map((item, index) => (
            <div key={index} className={styles.productRow}>
              <div className={styles.productInfo}>
                <span>{item.product.name}</span>
                {item.quantity > 1 && <span>(x{item.quantity})</span>}
              </div>
              <div className={styles.price}>
                ${(item.product.price_buy * item.quantity).toFixed(2)}
              </div>
              <button
                className={styles.deleteButton}
                onClick={() => handleDeleteProduct(item.product.id)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
        <div className={styles.buttonContainer}>
          <div className={styles.total}>Costo total: ${totalCost.toFixed(2)}</div>
          <button type="submit" className={styles.submitButton}>Guardar</button>
        </div>
      </form>

      {showProductModal && (
        <div className={styles.modal} onClick={() => setShowProductModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Seleccionar Producto</h2>
              <button className={styles.closeBtn} onClick={() => setShowProductModal(false)}>×</button>
            </div>
            <div className={styles.productList}>
              {products.length === 0 ? (
                <p className={styles.emptyMessage}>No hay productos disponibles</p>
              ) : (
                products.map(product => (
                  <div key={product.id} className={styles.productItem}>
                    <div className={styles.productDetails}>
                      <h3>{product.name}</h3>
                      <p className={styles.productPrice}>${product.price_buy}</p>
                    </div>
                    <div className={styles.quantitySelector}>
                      <label>Cantidad:</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className={styles.quantityInput}
                      />
                      <button
                        className={styles.addProductBtn}
                        onClick={() => handleAddProduct(product)}
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className={styles.closeModalBtn} onClick={() => setShowProductModal(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterService;