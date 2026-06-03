import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './ViewProduct.module.css';
import Swal from 'sweetalert2';
import { Product } from '../types/Product';

function ViewProduct() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProduct = async () => {
    if (!id) return;
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
      }
    } catch (error) {
      console.error('Error al obtener el producto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: '¡Este producto será eliminado permanentemente!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        if (!id) return;
        const docRef = doc(db, 'products', id);
        await deleteDoc(docRef);
        Swal.fire('Eliminado!', 'El producto ha sido eliminado.', 'success');
        // Redirigir después de eliminar
        window.location.href = '/inventario';
      }
    } catch (error) {
      console.error('Error al eliminar el producto:', error);
      Swal.fire('Error', 'Hubo un problema al eliminar el producto', 'error');
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  if (loading) return <div>Cargando...</div>;
  if (!product) return <div>Producto no encontrado</div>;

  return (
    <div className={styles.containerViewProduct}>
      <div className={styles.headerViewProduct}>
        <Link to="/inventario">
          <button className={styles.buttonInventory}>
            <img src="/images/_-.png" alt="Volver" className={styles.iconoBoton} />
            Volver
          </button>
        </Link>
        <h1 className={styles.titleViewProduct}>{product.name}</h1>
        <div className={styles.botonesViewProduct}>
          <Link to={`/AddStock/${product.id}`}>
            <button className={styles.buttonBuyProduct}>Agregar stock</button>
          </Link>
          <Link to={`/AddProduct/${product.id}`}>
            <button className={styles.buttonViewProduct}>Editar</button>
          </Link>
          <button
            className={styles.DeleteProduct}
            onClick={() => handleDelete()}
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className={styles.productInfo}>
        <div className={styles.productImageContainer}>
          <p><strong>Imagen del producto:</strong></p>
          <img
            src={product.image_url}
            alt="Imagen del producto"
            className={styles.productImage}
            loading='lazy'
          />
        </div>
        <div className={styles.productDetails}>
          <div className={styles.detailRow}>
            <span className={styles.label}>Nombre del producto:</span>
            <span className={styles.value}>{product.name}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Descripción del producto:</span>
            <span className={styles.value}>{product.description}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Categoría:</span>
            <span className={styles.value}>{product.category}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>SKU:</span>
            <span className={styles.value}>{product.sku}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Precio de compra:</span>
            <span className={styles.value}>${product.price_purchase}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Precio de venta:</span>
            <span className={styles.value}>${product.price_buy}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Cantidad en STOCK:</span>
            <span className={styles.value}>{product.stock}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>STOCK MÍNIMO:</span>
            <span className={styles.value}>{product.stock_min}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>ALERTA DE REABASTESIMIENTO:</span>
            <span className={styles.value}>
              <img
                src={`/images/${product.refill ? "true" : "false"}.png`}
                alt="Refill"
                className={styles.iconoBoton}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewProduct;
