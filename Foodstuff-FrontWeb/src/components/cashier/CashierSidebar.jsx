import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChefHat, Menu, Wallet, X } from "lucide-react";
import { lerUsuario } from "../../services/auth";
import { SidebarUserMenu } from "../sideBar/SideBar";

export default function CashierSidebar() {
  const [aberta, setAberta] = useState(false);
  const location = useLocation();
  const user = lerUsuario() ?? {};
  const links = [{ to: "/caixa", label: "Caixa", icon: Wallet }];
  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Abrir menu"
        className="fixed left-3 top-2 z-40 rounded-lg border border-slate-200 bg-white p-2 lg:hidden print:hidden"
      >
        <Menu size={18} />
      </button>
      {aberta && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setAberta(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 print:hidden ${aberta ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Link
          to="/caixa"
          onClick={() => setAberta(false)}
          className="flex h-20 items-center gap-2 px-4 font-extrabold text-slate-900"
        >
          <span className="rounded-xl bg-[#ff5f38] p-2 text-white">
            <ChefHat size={20} />
          </span>
          Foodstuff
          <span className="rounded border border-slate-200 px-1 text-[9px] text-slate-500">
            CAIXA
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setAberta(false)}
          aria-label="Fechar menu"
          className="absolute right-2 top-2 p-1 lg:hidden"
        >
          <X size={16} />
        </button>
        <nav className="flex-1 space-y-2 px-3">
          {links.map(({ to, label, icon: Icon }) => {
            const active =
              location.pathname === to ||
              location.pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setAberta(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? "bg-[#fff0ec] text-[#ff5f38]" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
        <SidebarUserMenu key={location.key} user={user} />
      </aside>
    </>
  );
}
