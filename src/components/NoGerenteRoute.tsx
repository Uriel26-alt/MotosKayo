import { Navigate, Outlet } from 'react-router-dom';

// Bloquea al gerente de rutas que no le corresponden.
const NoGerenteRoute = () => {
  const role = localStorage.getItem("role");
  return role === "gerente" ? <Navigate to="/notificaciones" replace /> : <Outlet />;
};

export default NoGerenteRoute;
