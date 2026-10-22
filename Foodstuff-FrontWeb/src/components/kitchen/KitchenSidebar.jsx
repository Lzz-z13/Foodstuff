import { Link, useLocation } from "react-router-dom";
import { ChefHat, LogOut, Settings, X, Menu, UtensilsCrossed } from "lucide-react";
import { useState, useEffect } from "react";

import { lerUsuario } from "../../services/auth";

export default function KitchenSidebar() {
  const location = useLocation();
  const [aberta, setAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(lerUsuario());
  }, []);

  const fechar = () => {
    setAberta(false);
    setMenuAberto(false);
  };

  return (
    <>
      {/* Botão mobile */}
      {!aberta && (
        <button
          type="button"
          onClick={() => setAberta(true)}
          aria-label="Abrir menu"
          className="fixed top-4 left-4 z-40 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
        >
          <Menu size={20} />
        </button>
      )}

      {aberta && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={fechar}
          className="fixed inset-0 z-50 cursor-pointer bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
          aberta ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-100 px-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF5F38] shadow-[0_4px_12px_-2px_rgba(255,95,56,0.5)]">
            <ChefHat size={18} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-extrabold leading-tight tracking-tight text-slate-900">
              Foodstuff
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Cozinha
            </p>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar menu"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X size={17} />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto p-3">
          <Link
            to="/cozinha"
            onClick={fechar}
            aria-current={location.pathname === "/cozinha" ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-bold transition ${location.pathname === "/cozinha" ? "bg-[#FFF0EC] text-[#FF5F38]" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <ChefHat size={17} />
            Tela da Cozinha
          </Link>

          <p className="mt-6 mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-300">
            Em produção
          </p>
          <p className="px-3 text-[11.5px] leading-relaxed text-slate-400">
            Arraste os pedidos entre as colunas ou use os botões de ação para
            advancing o preparo.
          </p>
        </nav>

        {/* Perfil */}
        <div className="relative shrink-0 border-t border-slate-100 p-3">
          {menuAberto && (
            <div className="absolute right-3 bottom-[72px] left-3 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.24)]">
              <Link
                to="/minha-conta"
                onClick={fechar}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Settings size={15} className="text-slate-400" />
                Minha Conta
              </Link>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  window.location.href = "/";
                }}
                className="mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500">
              <UtensilsCrossed size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold text-slate-800">
                {user?.name || "Usuário"}
              </p>
              <p className="truncate text-[10.5px] text-slate-400">
                {user?.email || "—"}
              </p>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
