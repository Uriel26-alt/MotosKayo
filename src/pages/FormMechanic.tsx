import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from "firebase/auth";
import styles from './AddProduct.module.css';

function FormMechanic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  const [fullname, setFullname] = useState('');
  const [salary, setSalary] = useState(0);
  const [active, setActive] = useState(true);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchMechanic = async () => {
        const mechanicRef = doc(db, 'mechanics', id);
        const mechanicSnap = await getDoc(mechanicRef);
        if (mechanicSnap.exists()) {
          setFullname(mechanicSnap.data().fullName || '');
          setSalary(mechanicSnap.data().salary || 0);
          setActive(mechanicSnap.data().active || false);
          setPhotoUrl(mechanicSnap.data().photoUrl || '');
        }
      };
      fetchMechanic();
    }
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida (JPG, PNG, etc.)');
      return;
    }

    // Validar tamaño (máximo 500KB para mejor rendimiento)
    if (file.size > 500 * 1024) {
      alert('La imagen es muy grande. Por favor selecciona una imagen menor a 500KB');
      return;
    }

    setUploading(true);

    // Leer y convertir imagen a Base64
    const reader = new FileReader();

    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setPhotoUrl(base64String);
      setUploading(false);
      console.log('✓ Imagen procesada correctamente');
    };

    reader.onerror = () => {
      alert('Error al leer la imagen');
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullname || salary <= 0) {
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    try {
      if (id) {
        const mechanicRef = doc(db, 'mechanics', id);
        await updateDoc(mechanicRef, {
          fullName: fullname,
          salary: Number(salary),
          active: active,
          photoUrl: photoUrl || '',
        });
        alert('Mecánico actualizado exitosamente');
      } else {
        await addDoc(collection(db, 'mechanics'), {
          fullName: fullname,
          salary: Number(salary),
          active: active,
          photoUrl: photoUrl || '',
        });
        alert('Mecánico agregado exitosamente');
      }
      navigate('/mecanicos/');
    } catch (error: any) {
      console.error('Error:', error);
      alert('Hubo un error al procesar la operación: ' + error.message);
    }
  };

  return (
    <div className={styles.containerAddProduct}>
      <div className={styles.headerAddProduct}>
        <h1 className={styles.titleAddProduct}>{id ? 'Editar' : 'Agregar'} Mecánico</h1>
        <Link to="/mecanicos">
          <button className={styles.buttonInventory}>
            <img src="/images/_-.png" alt="Volver" className={styles.iconoBoton} />
            Volver
          </button>
        </Link>
      </div>

      <form className={styles.formAddProduct} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Nombre completo</label>
            <input
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Sueldo</label>
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              min="0"
              step="0.01"
              required
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Foto del mecánico (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading && (
              <p style={{ fontSize: '0.85rem', color: '#E95A0C', marginTop: '8px', fontWeight: '600' }}>
                ⏳ Subiendo imagen, por favor espera...
              </p>
            )}
            {photoUrl && !uploading && (
              <div style={{ marginTop: '12px' }}>
                <img
                  src={photoUrl}
                  alt="Vista previa"
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    border: '3px solid #E95A0C'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '5px', fontWeight: '600' }}>
                  ✓ Imagen cargada exitosamente
                </p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputGroup}>
            <label>Activo</label>
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxLabel}>{active ? 'Sí' : 'No'}</span>
            </div>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <button type="submit" className={styles.submitButton} disabled={uploading}>
            {uploading ? 'Esperando imagen...' : (id ? 'Actualizar' : 'Guardar')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormMechanic;