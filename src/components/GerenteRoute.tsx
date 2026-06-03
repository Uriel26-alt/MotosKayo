import { Navigate, Outlet } from 'react-router-dom';

// Solo permite acceso al rol "gerente". Los demás van a /Ventas.
const GerenteRoute = () => {
  const role = localStorage.getItem("role");
  return role === "gerente" ? <Outlet /> : <Navigate to="/Ventas" replace />;
};

export default GerenteRoute;
