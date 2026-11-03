import { Navigate, Outlet, useLocation } from "react-router-dom";
import { lerUsuario } from "../../services/auth";

export default function ProtectedRoute() {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) return <Navigate to="/" replace />;

  return <Outlet />;
}
