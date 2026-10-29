/**
 * Helpers de sessão/role compartilhados pelas rotas protegidas.
 */

export function lerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("user") ?? "null") ?? null;
  } catch {
    return null;
  }
}

export function getRole() {
  return lerUsuario()?.role ?? null;
}

export function temToken() {
  return !!localStorage.getItem("token");
}

/** Rota inicial de cada role após o login. */
export function homePorRole(role) {
  switch (role) {
    case "KITCHEN":
      return "/cozinha";
    default:
      return "/home";
  }
}

/** Telas que cada role pode acessar. */
export const ROTAS_POR_ROLE = {
  KITCHEN: ["/cozinha", "/minha-conta"],
  MANAGER: [
    "/home",
    "/pedidos",
    "/cardapio",
    "/mesas",
    "/equipe",
    "/cadastro",
    "/minha-conta",
  ],
  CASHIER: ["/pedidos", "/mesas", "/minha-conta"],
};

export function podeAcessar(pathname, role) {
  if (!role) return false;

  const permitidas = ROTAS_POR_ROLE[role];
  if (!permitidas) return false;

  return permitidas.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}
