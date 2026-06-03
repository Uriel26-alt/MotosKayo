import { useEffect, useState } from 'react';
import styles from './Inventory.module.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { Product } from '../types/Product';

function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const getProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productList: Product[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as unknown as Product[];

      setProducts(productList);

      const uniqueCategories = Array.from(new Set(productList.map(p => p.category)));
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error al obtener productos:", error);
    }
  };

  useEffect(() => {
    getProducts();
  }, []);

  return (
    <div className={styles.containerInventory}>
      <div className={styles.headerInventory}>
        <h1 className={styles.titleInventory}>Inventario</h1>

        <div className={styles.actions}>
          <div className={styles.selectWrapper}>
            <select
              className={styles.selectCategory}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="Todas">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <span className={styles.selectArrow}>▾</span>
          </div>

          <Link to="/AddProduct">
            <button className={styles.buttonInventory}>
              <img src="/images/Agregar.png" alt="Icono agregar" className={styles.iconoBoton} />
              Agregar producto
            </button>
          </Link>
        </div>
      </div>

      <table className={styles.tableInventory}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>NOMBRE</th>
            <th>CATEGORÍA</th>
            <th>PRECIO DE COMPRA</th>
            <th>PRECIO DE VENTA</th>
            <th>STOCK</th>
            <th>STOCK MINIMO</th>
            <th>ALERTA PARA REABASTECER</th>
            <th>ACCIÓN</th>
          </tr>
        </thead>
        <tbody>
          {products
            .filter(p => selectedCategory === 'Todas' || p.category === selectedCategory)
            .map((product) => (
              <tr className={product.refill && product.stock <= (product.stock_min ?? 0) ? styles.alert : ''} key={product.id}>
                <td>{product.sku || '—'}</td>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>${product.price_purchase}</td>
                <td>${product.price_buy}</td>
                <td>{product.stock}</td>
                <td>{product.stock_min}</td>
                <td>
                  <img
                    src={`/images/${product.refill ? "true" : "false"}.png`}
                    alt="Refill"
                    className={styles.iconoBoton}
                  />
                </td>
                <td>
                  <Link to={`/ViewProduct/${product.id}`} state={{ product }}>
                    <button className={styles.actionBtn}>
                      <img
                        src="/images/ojo-svgrepo-com.svg"
                        alt="Ver producto"
                        className={styles.iconImage}
                      />
                    </button>
                  </Link>
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Inventory;
