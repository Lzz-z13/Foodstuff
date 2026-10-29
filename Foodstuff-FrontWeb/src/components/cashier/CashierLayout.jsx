import { Outlet } from "react-router-dom";
import { lerUsuario } from "../../services/auth";
import CashierSidebar from "./CashierSidebar";

export default function CashierLayout() {
  return (
    <div className="flex min-h-screen bg-[#f8f9fb] text-slate-900">
      <CashierSidebar />
      <div className="min-w-0 flex-1">
        <header className="flex min-h-11 items-center justify-between border-b border-slate-200 bg-white px-4 pl-16 text-[11px] text-slate-500 lg:pl-6 print:hidden">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Caixa • {lerUsuario()?.name ?? "Atendimento"}
          </span>
          <span>Controle de comandas</span>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
