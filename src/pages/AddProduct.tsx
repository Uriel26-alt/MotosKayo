import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, getDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import TomSelect from 'react-select/creatable';
import { db } from '../firebase';
import axios from 'axios';
import styles from './AddProduct.module.css';

interface CategoryOption {
  label: string;
  value: string;
}

function AddProduct() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryOption | null>(null);
  const [sku, setSku] = useState('');
  const [pricePurchase, setPricePurchase] = useState('');
  const [profitPercentage, setProfitPercentage] = useState('');
  const [stock, setStock] = useState('');
  const [stock_min, setStockMin] = useState('');
  const [refill, setRefill] = useState(false);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categoriesOptions, setCategoriesOptions] = useState<CategoryOption[]>([]);
  const { id } = useParams();
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const options = querySnapshot.docs.map(doc => ({
        label: doc.data().name,
        value: doc.data().name,
      }));
      setCategoriesOptions(options);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const fetchProduct = async (id: string) => {
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const product = docSnap.data();
        setName(product.name);
        setCategory({ label: product.category, value: product.category });
        setSku(product.sku);
        setPricePurchase(product.price_purchase.toString());
        setProfitPercentage(((product.price_buy - product.price_purchase) / product.price_purchase * 100).toString());
        setStock(product.stock.toString());
        setStockMin(product.stock_min.toString());
        setRefill(product.refill);
        setDescription(product.description);
        setImageUrl(product.image_url);
      }
    } catch (error) {
      console.error('Error al cargar producto:', error);
    }
  };

  const generateSku = async () => {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const next = querySnapshot.size + 1;
    return `PRD-${String(next).padStart(3, '0')}`;
  };

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchProduct(id);
    } else {
      generateSku().then(setSku);
    }
  }, [id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !pricePurchase || !profitPercentage || !stock || !stock_min || !description) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      if (category && !categoriesOptions.some(opt => opt.value === category.value)) {
        await addDoc(collection(db, 'categories'), {
          name: category.value,
        });
        setCategoriesOptions([...categoriesOptions, { label: category.value, value: category.value }]);
      }

      let newImage = null;

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', 'mototec');

        const response = await axios.post('https://api.cloudinary.com/v1_1/dwpfwhpsc/image/upload', formData);
        newImage = response.data.secure_url;
      }

      const priceBuy = Number(pricePurchase) + (Number(pricePurchase) * Number(profitPercentage) / 100);

      if (id) {
        const docRef = doc(db, 'products', id);
        await updateDoc(docRef, {
          name,
          category: category.value,
          sku,
          price_purchase: Number(pricePurchase),
          price_buy: priceBuy,
          stock: Number(stock),
          stock_min: Number(stock_min),
          refill: Number(refill),
          description,
          image_url: newImage ? newImage : imageUrl,
        });
        alert('Producto actualizado exitosamente');
      } else {
        await addDoc(collection(db, 'products'), {
          name,
          category: category.value,
          sku,
          price_purchase: Number(pricePurchase),
          price_buy: priceBuy,
          stock: Number(stock),
          stock_min: Number(stock_min),
          refill: Number(refill),
          description,
          image_url: newImage ? newImage : imageUrl,
        });
        alert('Producto agregado exitosamente');
      }

      navigate('/inventario');
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('Hubo un error al guardar el producto');
    }
  };

  return (
    <div className={styles.containerAddProduct}>
      <div className={styles.headerAddProduct}>
        <h1 className={styles.titleAddProduct}>{id ? 'Editar Producto' : 'Agregar Producto'}</h1>
        <Link to="/inventario">
          <button className={styles.buttonInventory}>
            <img src="/images/_-.png" alt="Volver" className={styles.iconoBoton} />
            Volver
          </button>
        </Link>
      </div>

      <form className={styles.formAddProduct} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Nombre del producto</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label>Selecciona la categoría</label>
            <TomSelect
              options={categoriesOptions}
              value={category}
              onChange={(option) => setCategory(option as CategoryOption)}
              placeholder="Escribe o selecciona una categoría"
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>SKU</label>
            <input type="text" value={sku} onChange={e => setSku(e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Precio de compra</label>
            <input type="number" value={pricePurchase} onChange={e => setPricePurchase(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label>Porcentaje de ganancia</label>
            <input type="number" value={profitPercentage} onChange={e => setProfitPercentage(e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Cantidad inicial en STOCK</label>
            <input type="number" value={stock} onChange={e => setStock(e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Cantidad de STOCK MÍNIMO</label>
            <input type="number" value={stock_min} onChange={e => setStockMin(e.target.value)} min={0} step={1} />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroupStart}>
            <label>¿Alerta de reabastesimiento?</label>
            <input type="checkbox" checked={refill} onChange={e => setRefill(e.target.checked)} />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label>Descripción del producto</label>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}></textarea>
        </div>

        <div className={styles.inputGroup}>
          <label>Seleccione la imagen del producto</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </div>

        <div className={styles.buttonContainer}>
          <button type="submit" className={styles.submitButton}>{id ? 'Actualizar' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}

export default AddProduct;
