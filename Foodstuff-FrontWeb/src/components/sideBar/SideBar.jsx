import {
  LogOut, Settings, UserRoundPlus, UsersRound, Table2,
  HandPlatter, ScrollText, House, ForkKnife, UserRound, ChevronUp,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { lerUsuario, podeAcessar } from "../../services/auth";

const LINKS = [
  { path: "/home", label: "Dashboard", icon: House },
  { path: "/pedidos", label: "Pedidos", icon: ScrollText },
  { path: "/cardapio", label: "Cardápio", icon: HandPlatter },
  { path: "/mesas", label: "Mesas", icon: Table2 },
  { path: "/equipe", label: "Equipe", icon: UsersRound },
  { path: "/cadastro", label: "Cadastrar Usuário", icon: UserRoundPlus },
];

export function SidebarUserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function closeOutside(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0 border-t border-gray-100 p-2 md:p-3">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Opções de ${user.name || "usuário"}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-100 md:justify-start"
      >
        <UserRound size={20} className="shrink-0 text-gray-500 md:hidden" />
        <span className="hidden min-w-0 flex-1 md:block">
          <span className="block truncate text-xs font-semibold text-gray-800">{user.name || "Usuário"}</span>
          <span className="mt-1 block truncate text-[10px] text-gray-500">{user.email}</span>
        </span>
        <ChevronUp size={16} className={`hidden shrink-0 text-gray-400 transition-transform md:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={panelId} className="absolute bottom-full left-2 z-50 mb-2 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg md:left-3 md:right-3 md:w-auto">
          <Link
            to="/minha-conta"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Settings size={16} />
            Minha Conta
          </Link>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.href = "/";
            }}
            className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

export default function SideBar() {
  const location = useLocation();
  const user = lerUsuario() ?? {};
  const links = user.role === "KITCHEN"
    ? [{ path: "/cozinha", label: "Cozinha", icon: ForkKnife }]
    : LINKS;

  return (
    <aside
      aria-label="Menu principal"
      className="sticky top-0 z-30 flex h-dvh w-16 shrink-0 flex-col border-r border-gray-200 bg-white md:w-60"
    >
      <div className="flex h-20 shrink-0 items-center justify-center gap-2 border-b border-gray-100 px-3 md:justify-start md:px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ff5a47] text-white">
          <ForkKnife size={18} />
        </span>
        <div className="hidden min-w-0 md:block">
          <strong className="text-sm font-semibold text-gray-800">Foodstuff</strong>
          <p className="text-[10px] text-gray-500">{user.role === "MANAGER" ? "Admin / Gerente" : "Painel do funcionário"}</p>
        </div>
      </div>

      <nav aria-label="Páginas do sistema" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-5">
        {links.filter(({ path }) => podeAcessar(path, user.role)).map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              title={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center justify-center gap-3 rounded-lg px-2.5 py-2.5 text-[13px] transition md:justify-start ${active ? "bg-[#ff5a47] text-white" : "text-gray-600 hover:bg-[#ff5a47] hover:text-white"}`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <SidebarUserMenu key={location.key} user={user} />
    </aside>
  );
}
