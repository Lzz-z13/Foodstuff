import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

import { getRole, homePorRole, podeAcessar } from "../../services/auth";

/**
 * Protege a rota por role.
 * Sem token -> / (login).
 * Sem autorização -> redireciona para a home do próprio role.
 */
export default function RoleRoute({ allowedRoles }) {
  const location = useLocation();
  const [estado, setEstado] = useState({ carregando: true, permitido: false });

  useEffect(() => {
    const role = getRole();

    if (!role) {
      setEstado({ carregando: false, permitido: false });
      return;
    }

    const permitido = allowedRoles
      ? allowedRoles.includes(role)
      : podeAcessar(location.pathname, role);

    setEstado({ carregando: false, permitido });
  }, [location.pathname, allowedRoles]);

  if (estado.carregando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#ff5a47]" />
      </div>
    );
  }

  if (!estado.permitido) {
    return <Navigate to={homePorRole(getRole())} replace />;
  }

  return <Outlet />;
}
