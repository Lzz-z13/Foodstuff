import { Link } from "react-router-dom";
import {
  House,
  ScrollText,
  HandPlatter,
  Table2,
  UsersRound,
  Settings,
  UserRoundPlus,
  ForkKnife,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const LINK_BASE = `
  flex items-center gap-2
  rounded-lg
  px-2.5 py-2.5
  text-[13px]
  text-gray-600
  whitespace-nowrap
  transition
  hover:bg-[#ff5a47]
  hover:text-white
`;

export default function SideBar() {
  // Drawer começa FECHADO — a tela fica livre, sem sidebar fixa
  const [aberta, setAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") ?? "null") ?? {};

  const fechar = () => {
    setAberta(false);
    setMenuAberto(false);
  };

  // ESC fecha + trava scroll do fundo enquanto aberta
  useEffect(() => {
    if (!aberta) return;

    function aoPressionarEsc(e) {
      if (e.key === "Escape") fechar();
    }

    document.addEventListener("keydown", aoPressionarEsc);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", aoPressionarEsc);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberta]);

  return (
    <>
      {/* BOTÃOZINHO — o único jeito de acionar a sidebar */}
      {!aberta && (
        <button
          type="button"
          onClick={() => setAberta(true)}
          aria-label="Abrir menu"
          className="fixed top-4 left-4 z-40 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Menu size={20} />
        </button>
      )}

      {/* BACKDROP — escurece a tela e fecha ao clicar */}
      {aberta && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={fechar}
          className="fixed inset-0 z-50 cursor-pointer bg-black/50"
        />
      )}

      {/* DRAWER — sobrepõe a tela, não empurra conteúdo */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-[260px] max-w-[85vw] flex-col
          border-r border-gray-200 bg-white shadow-2xl
          transition-transform duration-300 ease-in-out
          ${aberta ? "translate-x-0" : "pointer-events-none -translate-x-full"}
        `}
      >
        {/* LOGO + FECHAR */}
        <div className="flex h-14 items-center gap-2 px-3">
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
            className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={17} />
          </button>
        </div>

        {/* MENU */}
        <nav className="mt-5 flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
          <Link to="/home" onClick={fechar} className={LINK_BASE}>
            <House size={16} />
            <span>Dashboard</span>
          </Link>

          <Link to="/pedidos" onClick={fechar} className={LINK_BASE}>
            <ScrollText size={16} />
            <span>Pedidos</span>
          </Link>

          <Link to="/cardapio" onClick={fechar} className={LINK_BASE}>
            <HandPlatter size={16} />
            <span>Cardápio</span>
          </Link>

          <Link to="/mesas" onClick={fechar} className={LINK_BASE}>
            <Table2 size={16} />
            <span>Mesas</span>
          </Link>

          <Link to="/equipe" onClick={fechar} className={LINK_BASE}>
            <UsersRound size={16} />
            <span>Equipe</span>
          </Link>

          <Link to="/configs" onClick={fechar} className={LINK_BASE}>
            <Settings size={16} />
            <span>Configs do Restaurante</span>
          </Link>

          <Link to="/cadastro" onClick={fechar} className={`${LINK_BASE} mt-2`}>
            <UserRoundPlus size={16} />
            <span>Cadastrar Usuário</span>
          </Link>
        </nav>

        {/* USUÁRIO */}
        <div className="relative border-gray-100 px-3 py-4">
          <button
            type="button"
            onClick={() => setMenuAberto(!menuAberto)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-1 text-left hover:bg-gray-200"
          >
            <span className="h-8 w-8 shrink-0 rounded-full bg-gray-300" />

            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-gray-800">
                {user.name}
              </p>

              <p className="truncate text-[8px] text-gray-400">{user.email}</p>
            </div>
          </button>

          {menuAberto && (
            <div className="absolute right-2 bottom-[75px] left-2 z-50 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
              <Link
                to="/minha-conta"
                onClick={() => {
                  setMenuAberto(false);
                  setAberta(false);
                }}
                className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
              >
                <Settings size={16} />
                <span className="ml-2">Minha Conta</span>
              </Link>

              <button
                type="button"
                className="mt-1 flex w-full cursor-pointer rounded-lg px-3 py-2 text-left text-xs text-red-500 hover:bg-red-100"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  window.location.href = "/";
                }}
              >
                <LogOut size={16} />
                <span className="ml-2">Sair</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
