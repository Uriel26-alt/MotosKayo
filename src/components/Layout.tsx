import Header from './Header'; 
import SidePanel from './SidePanel';
import styles from './Layout.module.css';
import { Outlet } from 'react-router-dom';



const Layout = () => {
  return (
    <div>
      <Header />
      <div className={styles.yield}>
        <div className={styles.aside}>
          <SidePanel />
        </div>
        <div className={styles.content}>
        <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
