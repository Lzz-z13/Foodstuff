import { CalendarDays, ChevronDown } from "lucide-react";

export default function Header({ onDateClick }) {
  const user = JSON.parse(localStorage.getItem("user") ?? "null") ?? {};

  return (
    <header className="flex h-20 w-full items-center justify-between gap-3 px-4 md:px-10">
      {/* pl-12 = espaço pro botão flutuante da sidebar (fixed left-4) */}
      <div className="min-w-0 pl-12">
        <h1 className="truncate text-[22px] font-bold text-slate-900">
          Bom dia, {user.name ?? "Usuário"}
        </h1>

        <p className="mt-1 hidden text-sm text-slate-500 sm:block">
          Aqui está um resumo do desempenho do seu Foodstuff hoje.
        </p>
      </div>
    </header>
  );
}
