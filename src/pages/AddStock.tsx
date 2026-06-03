import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from "firebase/auth";
import styles from './AddProduct.module.css';

function AddStock() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  const [stock, setStock] = useState('');
  const [precioTotal, setPrecioTotal] = useState('');
  const [currentStock, setCurrentStock] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const productRef = doc(db, 'products', id);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        setCurrentStock(productSnap.data().stock || 0);
      }
    };
    fetchProduct();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stock || !precioTotal) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      if (!id) {
        alert('ID del producto no encontrado');
        return;
      }
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, {
        stock: currentStock + Number(stock),
      });

      const comprasRef = collection(db, 'compras');
      await addDoc(comprasRef, {
        productoId: id,
        cantidad: Number(stock),
        precioTotal: Number(precioTotal),
        usuario: user?.email,
        fecha: new Date(),
      });

      alert('Stock actualizado y compra registrada exitosamente');
      navigate(`/ViewProduct/${id}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Hubo un error al procesar la operación');
    }
  };

  return (
    <div className={styles.containerAddProduct}>
      <div className={styles.headerAddProduct}>
        <h1 className={styles.titleAddProduct}>Agregar Stock</h1>
        <Link to={`/ViewProduct/${id}`}>
          <button className={styles.buttonInventory}>
            <img src="/images/_-.png" alt="Volver" className={styles.iconoBoton} />
            Volver
          </button>
        </Link>
      </div>

      <form className={styles.formAddProduct} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Cantidad comprada</label>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
              min="1"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Precio total de la compra</label>
            <input
              type="number"
              value={precioTotal}
              onChange={e => setPrecioTotal(e.target.value)}
              min="0.01"
              step="0.01"
            />
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <button type="submit" className={styles.submitButton}>Guardar</button>
        </div>
      </form>
    </div>
  );
}

export default AddStock;