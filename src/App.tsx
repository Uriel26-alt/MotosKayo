import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // 👈 Agrega Navigate
import Layout from './components/Layout';
import Inventory from './pages/Inventory';
import AddProduct from './pages/AddProduct';
import EditProduct from './pages/ViewProduct';
import Services from './pages/services';
import RegisterService from './pages/RegisterService';
import ViewProduct from './pages/ViewProduct';
import ViewService from './pages/ViewService';
import Ventas from './pages/Ventas';
import Login from './components/Login';
import AuthLayout from './components/AuthLayout';
import PrivateRoute from './components/PrivateRoute';
import ReportPage from './pages/ReportPage';
import Movimientos from './pages/movimientos';
import Users from './pages/Users';
import AddStock from './pages/AddStock';
import Mechanics from './pages/Mechanics';
import FormMechanic from './pages/FormMechanic';
import ViewMechanic from './pages/ViewMechanic';
import Notificaciones from './pages/Notificaciones';
import GerenteRoute from './components/GerenteRoute';
import Proyecciones from './pages/Proyecciones';
function App() {
  return (
    <Router>
      <Routes>
        {/* Redirección del root "/" al login */}
        <Route path="/" element={<Navigate to="/Login" />} />

        {/* Layout de login */}
        <Route element={<AuthLayout />}>
          <Route path="/Login" element={<Login />} />
        </Route>

        {/* Layout principal protegido */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>

            {/* Rutas exclusivas del gerente */}
            <Route element={<GerenteRoute />}>
              <Route path="/notificaciones" element={<Notificaciones />} />
              <Route path="/users" element={<Users />} />
            </Route>

            {/* Rutas accesibles para todos los roles */}
            <Route path="/inventario" element={<Inventory />} />
            <Route path="/AddProduct" element={<AddProduct />} />
            <Route path="/AddProduct/:id" element={<AddProduct />} />
            <Route path="/ViewProduct/:id" element={<ViewProduct />} />
            <Route path="/EditProduct" element={<EditProduct />} />
            <Route path='/AddStock/:id' element={<AddStock />} />
            <Route path="/services" element={<Services />} />
            <Route path="/registerService" element={<RegisterService />} />
            <Route path="/registerService/:id" element={<RegisterService />} />
            <Route path="/ViewService/:id" element={<ViewService />} />
            <Route path="/Ventas" element={<Ventas />} />
            <Route path="/ReportPage" element={<ReportPage />} />
            <Route path='/movimientos' element={<Movimientos />} />
            <Route path='/mecanicos' element={<Mechanics />} />
            <Route path='/mecanicos/form' element={<FormMechanic />} />
            <Route path='/mecanicos/form/:id' element={<FormMechanic />} />
            <Route path='/mecanicos/:id' element={<ViewMechanic />} />
            <Route path='/proyecciones' element={<Proyecciones />} />

          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
