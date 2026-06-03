import { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import styles from './Header.module.css';

const Header = () => {
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser ?? null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDropdown]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("role");
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <img src="/images/LogoKayo.png" alt="Logo" className={styles.logo} />
      </div>

      <div className={styles.headerRight} ref={dropdownRef}>
        {user ? (
          <>
            <div
              className={styles.userTrigger}
              onClick={() => setShowDropdown((v) => !v)}
            >
              <img
                src="/images/User.png"
                alt="Avatar"
                className={styles.avatar}
              />
              <span className={styles.username}>
                {user.displayName || user.email}
              </span>
              <span className={`${styles.chevron} ${showDropdown ? styles.chevronOpen : ''}`}>
                ▼
              </span>
            </div>

            {showDropdown && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownUser}>
                  <img
                    src="/images/User.png"
                    alt="Avatar"
                    className={styles.dropdownAvatar}
                  />
                  <div className={styles.dropdownUserInfo}>
                    <span className={styles.dropdownName}>
                      {user.displayName || 'Usuario'}
                    </span>
                    <span className={styles.dropdownEmail}>{user.email}</span>
                  </div>
                </div>

                <button className={styles.logoutButton} onClick={handleLogout}>
                  <span className={styles.logoutIcon}>⏻</span>
                  Cerrar sesión
                </button>
              </div>
            )}
          </>
        ) : (
          <span className={styles.username}>Inicia sesión</span>
        )}
      </div>
    </header>
  );
};

export default Header;
