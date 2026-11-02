import {
  X,
  Menu,
  LogOut,
  Settings,
  UserRoundPlus,
  UsersRound,
  Table2,
  HandPlatter,
  ScrollText,
  House,
  ForkKnife,
  UserRound,
  ChevronUp,
} from "lucide-react";

import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { lerUsuario, podeAcessar } from "../../services/auth";

const LINK_BASE = `
  flex items-center gap-2
  rounded-lg
  px-2.5 py-2.5
  text-[13px]
  whitespace-nowrap
  transition
  hover:bg-[#ff5a47]
  hover:text-white
`;

const LINKS = [
  { path: "/home", label: "Dashboard", icon: House },
  { path: "/pedidos", label: "Pedidos", icon: ScrollText },
  { path: "/cardapio", label: "Cardápio", icon: HandPlatter },
  { path: "/mesas", label: "Mesas", icon: Table2 },
  { path: "/equipe", label: "Equipe", icon: UsersRound },
  {
    path: "/cadastro",
    label: "Cadastrar Usuário",
    icon: UserRoundPlus,
  },
];

export function SidebarUserMenu({ user }) {
  const [open, setOpen] = useState(false);

  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
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
    <div
      ref={containerRef}
      className="relative shrink-0 border-t border-gray-100 p-2 md:p-3"
    >
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

        <span className="hidden min-w-0 flex-1 md:flex md:items-center md:gap-3">
          <span className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <img
              src={user.photo}
              alt={user.name || "Foto do usuário"}
              className="w-full h-full object-cover"
            />
          </span>

          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-gray-800">
              {user.name || "Usuário"}
            </span>

            <span className="mt-1 block truncate text-[10px] text-gray-500">
              {user.email}
            </span>
          </span>
        </span>

        <ChevronUp
          size={16}
          className={`hidden shrink-0 text-gray-400 transition-transform md:block ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute bottom-full left-2 z-50 mb-2 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg md:left-3 md:right-3 md:w-auto"
        >
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
  const [aberta, setAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const [desktop, setDesktop] = useState(
    () => window.matchMedia("(min-width: 64rem)").matches,
  );

  const abrirRef = useRef(null);
  const painelRef = useRef(null);

  const location = useLocation();
  const user = lerUsuario() ?? {};

  const fechar = () => {
    setAberta(false);
    setMenuAberto(false);
  };

  useEffect(() => {
    const media = window.matchMedia("(min-width: 64rem)");

    function aoRedimensionar(event) {
      setDesktop(event.matches);
      setAberta(false);
      setMenuAberto(false);
    }

    media.addEventListener("change", aoRedimensionar);

    return () => {
      media.removeEventListener("change", aoRedimensionar);
    };
  }, []);

  useEffect(() => {
    if (!aberta || desktop) return;

    const painel = painelRef.current;
    const botaoAbrir = abrirRef.current;

    if (!painel) return;

    const focaveis = () => [...painel.querySelectorAll("a[href], button")];

    focaveis()[0]?.focus();

    function aoPressionarTecla(event) {
      if (event.key === "Escape") {
        fechar();
      }

      if (event.key === "Tab") {
        const elementos = focaveis();
        const primeiro = elementos[0];
        const ultimo = elementos[elementos.length - 1];

        if (event.shiftKey && document.activeElement === primeiro) {
          event.preventDefault();
          ultimo?.focus();
        } else if (!event.shiftKey && document.activeElement === ultimo) {
          event.preventDefault();
          primeiro?.focus();
        }
      }
    }

    document.addEventListener("keydown", aoPressionarTecla);

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", aoPressionarTecla);

      document.body.style.overflow = overflowAnterior;

      if (!window.matchMedia("(min-width: 64rem)").matches) {
        botaoAbrir?.focus();
      }
    };
  }, [aberta, desktop]);

  const links = LINKS.filter(({ path }) => podeAcessar(path, user.role));

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <aside
        id="sidebar-admin"
        ref={painelRef}
        aria-label="Menu principal"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 max-w-[85vw] shrink-0 flex-col border-r border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:z-30 lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#ff5a47] text-white">
            <ForkKnife size={15} />
          </span>

          <strong className="whitespace-nowrap text-[14px] font-semibold text-gray-800">
            Foodstuff
          </strong>

          <span className="shrink-0 rounded border border-gray-200 px-1 py-[2px] text-[7px] font-semibold text-gray-500">
            ADMIN
          </span>

          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar menu"
            className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          >
            <X size={17} />
          </button>
        </div>

        <nav className="mt-5 flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
          {links.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={fechar}
              className={`${LINK_BASE} ${
                isActive(path) ? "bg-[#ff5a47] text-white" : "text-gray-600"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <SidebarUserMenu key={location.key} user={user} />
      </aside>
    </>
  );
}
