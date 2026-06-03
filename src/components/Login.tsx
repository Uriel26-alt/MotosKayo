import React, { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let response = await signInWithEmailAndPassword(auth, email, password);
      const token = await response?.user?.getIdToken();
      localStorage.setItem("accessToken", token);
      const userEmail = response?.user?.email ?? "";

      // Check Firestore for role and active status
      const userDoc = await getDoc(doc(db, 'users', response.user.uid));
      let role = "admin";

      console.log('Usuario UID:', response.user.uid);
      console.log('Email:', userEmail);
      console.log('Documento existe en Firestore:', userDoc.exists());

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('Datos del usuario:', userData);
        if (!userData.active) {
          await auth.signOut();
          setError("Tu cuenta ha sido desactivada. Contacta al administrador.");
          return;
        }
        role = userData.role;

        // Fix: Corregir roles según email si no coinciden
        const roleMap: Record<string, 'gerente' | 'admin' | 'ventas'> = {
          'gerente@gmail.com': 'gerente',
          'urieldiaz262004@hotmail.com': 'admin',
          'UsuarioVentas@gmail.com': 'ventas',
        };

        const expectedRole = roleMap[userEmail];
        if (expectedRole && role !== expectedRole) {
          console.log(`Corrigiendo rol de ${userEmail} de ${role} a ${expectedRole}`);
          role = expectedRole;
          await updateDoc(doc(db, 'users', response.user.uid), { role: expectedRole });
          console.log('Rol actualizado en Firestore');
        }
      } else {
        // Fallback for users without Firestore doc (legacy)
        // Auto-create user document in Firestore
        console.log('Usuario no existe en Firestore, creando...');

        // Asignar rol según email
        const roleMap: Record<string, 'gerente' | 'admin' | 'ventas'> = {
          'gerente@gmail.com': 'gerente',
          'urieldiaz262004@hotmail.com': 'admin',
          'UsuarioVentas@gmail.com': 'ventas',
          'paohernandez651@gmail.com': 'ventas',
          'ianandres111@gmail.com': 'ventas',
        };

        role = roleMap[userEmail] || 'admin'; // Por defecto admin si no está en la lista

        console.log('Rol asignado:', role);

        // Create user document automatically
        const displayNameMap: Record<string, string> = {
          'gerente@gmail.com': 'Gerente',
          'urieldiaz262004@hotmail.com': 'Usuario Administrador',
          'UsuarioVentas@gmail.com': 'Usuario Ventas',
        };

        const displayName = displayNameMap[userEmail] || userEmail.split('@')[0]; // Use email prefix as default name
        const userData = {
          uid: response.user.uid,
          displayName: displayName,
          email: userEmail,
          role: role,
          active: true,
          createdAt: Timestamp.now(),
        };

        console.log('Creando documento con datos:', userData);

        try {
          await setDoc(doc(db, 'users', response.user.uid), userData);
          console.log('Documento creado exitosamente');
        } catch (createError) {
          console.error('Error al crear documento:', createError);
          throw createError;
        }
      }

      localStorage.setItem("role", role);
      navigate(role === "gerente" ? "/notificaciones" : "/Ventas");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("Usuario no encontrado.");
      } else if (err.code === "auth/wrong-password") {
        setError("Contraseña incorrecta.");
      } else {
        setError("Error al iniciar sesión. Verifica tu email y contraseña.");
      }
    }
  };
  return (
    <div className={styles.container}>
      <div className={styles.backgroundShapes}>
        <div className={styles.shape1}></div>
        <div className={styles.shape2}></div>
        <div className={styles.shape3}></div>
        <div className={styles.shape4}></div>
        <div className={styles.shape5}></div>
      </div>

      <div className={styles.loginCard}>
        <div className={styles.logoSection}>
          <img src="/images/LogoKayo.png" alt="Kayo" className={styles.logoImg} />
          <p className={styles.frase}>"Cuidamos tu moto, potenciamos tu camino."</p>
        </div>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.remember}>
            <input type="checkbox" id="remember" />
            <label htmlFor="remember">Recordar sesión</label>
          </div>

          <button type="submit" className={styles.submitBtn}>
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
};
export default Login;
