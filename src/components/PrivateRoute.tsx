// src/components/PrivateRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    return <Navigate to="/Login" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
