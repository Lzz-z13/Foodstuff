import { CalendarDays, ChevronDown } from "lucide-react";

export default function Header({ userName, onDateClick }) {
  return (
    <header className="w-full mb-4 border-b border-none bg-grey">
      <div className="flex min-h-[82px] w-full items-center justify-between gap-6 px-6 py-5 lg:px-8">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-slate-900">
            Bom dia, {userName}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Aqui está um resumo do desempenho do seu Foodstuff hoje.
          </p>
        </div>

        <button
          type="button"
          onClick={onDateClick}
          className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <CalendarDays size={17} className="text-slate-500" />
          <ChevronDown size={16} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
}
