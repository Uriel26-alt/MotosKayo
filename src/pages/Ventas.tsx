import { useState, useEffect } from 'react';
import { doc, collection, getDoc, getDocs, addDoc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './Ventas.module.css';
import Swal from 'sweetalert2';
import Select from 'react-select/creatable';
import { Product } from '../types/Product';
import { Client } from '../types/Client';
import { Sale, SaleItem } from '../types/Venta';
import jsPDF from 'jspdf';
import { getAuth } from "firebase/auth";

interface ClientOption {
  label: string;
  value: string;
}

export default function Ventas() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const auth = getAuth();
  const user = auth.currentUser;

  // Cargar productos y clientes
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar productos
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsData);

        // Cargar clientes
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];
        setClients(clientsData);

        // Preparar opciones para el Select
        const options = clientsData.map(client => ({
          label: client.name,
          value: client.id
        }));
        setClientOptions(options);
      } catch (error) {
        console.error('Error loading data:', error);
        Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
      }
    };

    fetchData();
  }, []);

  const handleCreateClient = async (inputValue: string) => {
    try {
      const newClient = {
        name: inputValue
      };

      const docRef = await addDoc(collection(db, 'clients'), newClient);
      const newClientWithId = {
        ...newClient,
        id: docRef.id
      };

      // Actualizar estado
      setClients(prev => [...prev, newClientWithId]);
      setClientOptions(prev => [
        ...prev,
        { label: inputValue, value: docRef.id }
      ]);

      // Seleccionar el nuevo cliente
      setSelectedClient(newClientWithId);

      return { label: inputValue, value: docRef.id };
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      Swal.fire('Error', 'No se pudo agregar el cliente', 'error');
      return null;
    }
  };


  // Filtrar productos según término de búsqueda
  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);

      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            productId: product.id,
            name: product.name || 'Producto sin nombre',
            price: product.price_buy,
            quantity: 1,
            image_url: product.image_url
          }
        ];
      }
    });
  };

  // Actualizar cantidad de un producto en el carrito
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // Eliminar producto del carrito
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  // Calcular totales
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  const received = parseFloat(receivedAmount) || 0;
  const change = received - total;

  const DENOMINATIONS = [50, 100, 200, 500, 1000];

  // Finalizar venta
  const finalizeSale = async () => {
    if (cart.length === 0) {
      Swal.fire('Error', 'No hay productos en el carrito', 'error');
      return;
    }
    if (received <= 0) {
      Swal.fire('Monto requerido', 'Ingresa el monto recibido antes de finalizar la venta.', 'warning');
      return;
    }
    if (received < total) {
      Swal.fire('Monto insuficiente', `El monto recibido ($${received.toFixed(2)}) es menor al total ($${total.toFixed(2)})`, 'error');
      return;
    }

    // Verificar stock disponible
    for (const item of cart) {
      const productRef = doc(db, 'products', item?.productId);
      const productSnap = await getDoc(productRef);
      const productData = productSnap.data();

      if (!productSnap.exists() || (productData?.stock ?? 0) < item.quantity) {
        Swal.fire('Stock insuficiente', `No hay suficiente stock de "${item.name}"`, 'error');
        return;
      }
    }

    const result = await Swal.fire({
      title: '¿Finalizar venta?',
      text: `Total: $${total.toFixed(2)}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const saleData: Sale = {
          ...(selectedClient?.id && { clientId: selectedClient.id }),
          clientName: selectedClient?.name || 'Público en general',
          items: cart,
          subtotal,
          tax,
          total,
          date: new Date(),
          ...(user?.email && { userId: user.email }),
        };

        await addDoc(collection(db, 'sales'), saleData);

        // Actualizar stock
        const batch = writeBatch(db);
        for (const item of cart) {
          const productRef = doc(db, 'products', item.productId);
          batch.update(productRef, {
            stock: increment(-item.quantity)
          });
        }
        await batch.commit();

        // ── Ticket profesional ────────────────────────────
        // Cargar logo
        const logoImg = new Image();
        logoImg.src = '/images/LogoKayo.png';
        await new Promise<void>((resolve) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => resolve();
        });
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = logoImg.naturalWidth || 200;
        logoCanvas.height = logoImg.naturalHeight || 200;
        logoCanvas.getContext('2d')!.drawImage(logoImg, 0, 0);
        const logoBase64 = logoCanvas.toDataURL('image/png');

        // Altura dinámica según número de artículos
        const pageW = 80;
        const pageH = 178 + cart.length * 10 + (received > 0 ? 18 : 0);
        const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH] });

        const O: [number,number,number] = [233, 90, 12];   // naranja
        const B: [number,number,number] = [0, 0, 0];       // negro
        const G: [number,number,number] = [130, 130, 130]; // gris
        const V: [number,number,number] = [22, 163, 74];   // verde
        const mx = 5;          // margen horizontal
        const cw = pageW - mx * 2; // ancho de contenido
        const cx = pageW / 2;
        let y = 6;

        const sf = (style: 'normal'|'bold', size: number, color: [number,number,number] = B) => {
          pdf.setFont('helvetica', style);
          pdf.setFontSize(size);
          pdf.setTextColor(...color);
        };
        const tc = (text: string, yp: number) => pdf.text(text, cx, yp, { align: 'center' });
        const tl = (text: string, yp: number) => pdf.text(text, mx, yp);
        const tr = (text: string, yp: number) => pdf.text(text, pageW - mx, yp, { align: 'right' });
        const dash = (yp: number) => {
          pdf.setDrawColor(...G);
          pdf.setLineWidth(0.15);
          pdf.setLineDashPattern([1.2, 1.2], 0);
          pdf.line(mx, yp, pageW - mx, yp);
          pdf.setLineDashPattern([], 0);
        };
        const solid = (yp: number, color: [number,number,number] = O) => {
          pdf.setDrawColor(...color);
          pdf.setLineWidth(0.4);
          pdf.line(mx, yp, pageW - mx, yp);
        };

        // ── Logo ─────────────────────────────────────────
        pdf.addImage(logoBase64, 'PNG', cx - 10, y, 20, 16);
        y += 19;

        // ── Nombre tienda ─────────────────────────────────
        sf('bold', 14, O);
        tc('KAYO', y); y += 5;

        sf('normal', 6.5, G);
        tc('Cuidamos tu moto, potenciamos tu camino.', y); y += 4;

        solid(y); y += 4;

        // ── Dirección ─────────────────────────────────────
        sf('normal', 7, G);
        tc('Carretera Puerto Ángel #123', y); y += 4;
        tc('San Juan Chilateca, Oaxaca', y); y += 4;
        tc('Tel: 951-873-37-95', y); y += 4;
        tc('RFC: XAXX010101000', y); y += 5;

        dash(y); y += 4;

        // ── Folio, fecha y cajero ─────────────────────────
        const now = saleData.date as Date;
        const folio = String(Date.now()).slice(-6);
        const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        sf('bold', 7.5, B);
        tl(`Folio: #${folio}`, y);
        sf('normal', 7, G);
        tr(dateStr, y); y += 4;

        sf('normal', 7, G);
        tl(`Hora: ${timeStr}`, y);
        tr(user?.email?.split('@')[0] ?? 'cajero', y); y += 4;

        sf('normal', 7, G);
        tl('Método de pago: Efectivo', y); y += 5;

        dash(y); y += 4;

        // ── Cliente ───────────────────────────────────────
        sf('bold', 7, G);
        tl('CLIENTE:', y); y += 4;
        sf('bold', 8, B);
        tl(saleData.clientName, y); y += 5;

        dash(y); y += 4;

        // ── Encabezado artículos ──────────────────────────
        sf('bold', 7, G);
        tl('ARTÍCULO', y);
        pdf.text('CANT', cx, y, { align: 'center' });
        tr('IMPORTE', y); y += 3;

        solid(y, [200, 200, 200]); y += 4;

        // ── Artículos ─────────────────────────────────────
        for (const item of cart) {
          const name = item.name.length > 22 ? item.name.slice(0, 20) + '..' : item.name;
          const lineTotal = (item.price * item.quantity).toFixed(2);

          sf('bold', 7.5, B);
          tl(name, y);
          pdf.text(`x${item.quantity}`, cx, y, { align: 'center' });
          tr(`$${lineTotal}`, y); y += 4;

          sf('normal', 6.5, G);
          tl(`  $${item.price.toFixed(2)} c/u`, y); y += 4;
        }

        dash(y); y += 4;

        // ── Totales ───────────────────────────────────────
        sf('normal', 7.5, G);
        tl('Subtotal:', y); tr(`$${subtotal.toFixed(2)}`, y); y += 4;
        tl('IVA 16%:', y);  tr(`$${tax.toFixed(2)}`, y);      y += 3;

        solid(y); y += 4;

        sf('bold', 11, O);
        tl('TOTAL:', y); tr(`$${total.toFixed(2)}`, y); y += 6;

        // ── Pago y cambio ─────────────────────────────────
        if (received > 0) {
          dash(y); y += 4;

          sf('normal', 7.5, G);
          tl('Efectivo recibido:', y); tr(`$${received.toFixed(2)}`, y); y += 5;

          sf('bold', 9, V);
          tl('Cambio:', y); tr(`$${(received - total).toFixed(2)}`, y); y += 6;
        }

        dash(y); y += 5;

        // ── Footer ────────────────────────────────────────
        sf('bold', 9, O);
        tc('¡Gracias por su visita!', y); y += 5;

        sf('normal', 6.5, G);
        tc('Conserve su ticket como comprobante.', y); y += 4;
        tc('Devoluciones en 7 días con ticket', y); y += 4;
        tc('y producto en buen estado.', y); y += 5;

        solid(y); y += 4;

        sf('normal', 6.5, G);
        tc('FB: @KayoMototec  |  IG: @kayo_mototec', y); y += 4;
        tc('www.kayomototec.com.mx', y);

        pdf.save('ticket_kayo.pdf');


        await Swal.fire({
          title: 'Éxito',
          text: 'Venta realizada correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });

        window.location.reload();
      } catch (error) {
        console.error('Error al registrar venta:', error);
        Swal.fire('Error', 'No se pudo registrar la venta', 'error');
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.productos}>
        <input
          type="text"
          className={styles.buscador}
          placeholder="Buscar producto"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className={styles.grid}>
          {filteredProducts.map((product) => {
            const sinStock = product.stock === 0;
            const stockBajo = !sinStock && product.refill && product.stock <= (product.stock_min ?? 0);
            return (
              <div
                key={product.id}
                className={`${styles.card} ${sinStock ? styles.cardAgotado : ''}`}
              >
                {sinStock && <span className={styles.badgeAgotado}>Sin stock</span>}
                {stockBajo && <span className={styles.badgeStockBajo}>Stock bajo</span>}
                <img
                  src={product.image_url || '/images/default-product.jpg'}
                  alt={product.name}
                  className={styles.imagen}
                  loading='lazy'
                />
                <div className={styles.nombreProducto}>{product.name}</div>
                <div className={styles.stockInfo}>
                  {sinStock
                    ? <span className={styles.stockCero}>Agotado</span>
                    : <span className={stockBajo ? styles.stockLow : styles.stockOk}>Stock: {product.stock}</span>
                  }
                </div>
                <div className={styles.precioT}>${product.price_buy.toFixed(2)}</div>
                <button
                  className={styles.boton}
                  onClick={() => !sinStock && addToCart(product)}
                  disabled={sinStock}
                >
                  {sinStock ? 'Agotado' : 'Agregar'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.carrito}>
        <div className={styles.cliente}>
          <span className={styles.SeleccionarC}>Selecciona al cliente</span>
          <Select
            options={clientOptions}
            isSearchable
            placeholder="Selecciona o crea un cliente..."
            noOptionsMessage={() => "Escribe para crear un nuevo cliente"}
            formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
            onChange={(selectedOption) => {
              if (!selectedOption) {
                setSelectedClient(null);
                return;
              }
              const client = clients.find(c => c.id === selectedOption.value);
              setSelectedClient(client || null);
            }}
            onCreateOption={handleCreateClient}
            value={selectedClient
              ? { label: selectedClient.name, value: selectedClient.id }
              : null
            }
            className={styles.selectClient}
            classNamePrefix="select"
          />
        </div>

        <div className={styles.lista}>
          {cart.length === 0 ? (
            <div className={styles.emptyCart}>El carrito está vacío</div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className={styles.item}>
                <img
                  src={item.image_url || '/images/default-product.jpg'}
                  className={styles.imgItem}
                  alt={item.name}
                  loading='lazy'
                />
                <div className={styles.info}>
                  <span>{item.name}</span>
                  <div className={styles.controles}>
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                      +
                    </button>
                    <span className={styles.precio}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  className={styles.eliminar}
                  onClick={() => removeFromCart(item.productId)}
                >
                  <img
                    src="/images/EliminarB.png"
                    alt="Eliminar"
                    className={styles.iconoEliminar}
                  />
                </button>
              </div>
            ))
          )}
        </div>

        <div className={styles.totales}>
          <div><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
          <div><span>IVA 16%</span><strong>${tax.toFixed(2)}</strong></div>
          <div className={styles.totalRow}><span>Total</span><strong className={styles.total}>${total.toFixed(2)}</strong></div>
        </div>

        {/* ── Caja registradora ── */}
        <div className={styles.cobro}>
          <p className={styles.cobroLabel}>
            <svg viewBox="0 0 24 24" fill="currentColor" className={styles.cobroIcon}><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
            Cobro
          </p>
          <div className={styles.denominaciones}>
            {DENOMINATIONS.map(d => (
              <button
                key={d}
                className={styles.denomBtn}
                onClick={() => setReceivedAmount(String(d))}
                type="button"
              >
                ${d}
              </button>
            ))}
            <button
              className={`${styles.denomBtn} ${styles.denomExacto}`}
              onClick={() => setReceivedAmount(total.toFixed(2))}
              type="button"
            >
              Exacto
            </button>
          </div>
          <div className={styles.reciboRow}>
            <span className={styles.reciboLabel}>Recibido</span>
            <div className={styles.reciboInputWrap}>
              <span className={styles.pesoSign}>$</span>
              <input
                type="number"
                className={styles.reciboInput}
                placeholder="0.00"
                min="0"
                step="0.01"
                value={receivedAmount}
                onChange={e => setReceivedAmount(e.target.value)}
              />
            </div>
          </div>
          <div className={`${styles.cambioBox} ${received === 0 ? styles.cambioNeutro : change >= 0 ? styles.cambioPos : styles.cambioNeg}`}>
            <span className={styles.cambioLabel}>Cambio</span>
            <span className={styles.cambioMonto}>
              {received === 0 ? '—' : change >= 0 ? `$${change.toFixed(2)}` : 'Monto insuficiente'}
            </span>
          </div>
        </div>

        <button
          className={styles.finalizar}
          onClick={finalizeSale}
          disabled={cart.length === 0 || received <= 0 || change < 0}
        >
          Finalizar venta
        </button>
      </div>
    </div>
  );
}