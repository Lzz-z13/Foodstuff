import { Search, SlidersHorizontal } from "lucide-react";
import { hora, moeda, numeroComanda, STATUS } from "./format";

export default function CommandList({
  commands,
  selectedId,
  onSelect,
  search,
  onSearch,
  filter,
  onFilter,
}) {
  return (
    <section className="min-w-0 print:hidden">
      <div className="mb-4 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            aria-label="Buscar comanda ou mesa"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar comanda ou mesa..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#ff5f38]"
          />
        </label>
        <label className="relative">
          <SlidersHorizontal
            size={16}
            className="pointer-events-none absolute left-3 top-3 text-slate-600"
          />
          <select
            aria-label="Filtrar comandas por status"
            value={filter}
            onChange={(e) => onFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-xs"
          >
            <option value="ALL">Todas</option>
            <option value="OPEN">Ativas</option>
            <option value="CLOSED">Fechadas</option>
          </select>
        </label>
      </div>
      <ul className="max-h-[calc(100vh-225px)] space-y-3 overflow-y-auto pr-1">
        {commands.map((command) => (
          <li key={command.command_id}>
            <button
              type="button"
              onClick={() => onSelect(String(command.command_id))}
              aria-pressed={String(command.command_id) === selectedId}
              className={`flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-[#ff5f38] ${String(command.command_id) === selectedId ? "border-[#ff5f38] ring-1 ring-[#ff5f38]" : "border-slate-200"}`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${String(command.command_id) === selectedId ? "bg-[#fff0ec] text-[#ff5f38]" : "bg-slate-50"}`}
              >
                {numeroComanda(command.command_id)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {command.customer_name}
                </span>
                <span
                  className={`mt-1 inline-block rounded px-1.5 text-[10px] ${command.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                >
                  {STATUS[command.status]}
                </span>
                <span className="ml-2 text-[10px] text-slate-400">
                  Mesa {command.table_number}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <strong className="block text-sm">
                  {moeda(command.balance)}
                </strong>
                <span className="text-[10px] text-slate-400">
                  Entrada: {hora(command.opened_at)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!commands.length && (
        <p className="p-8 text-center text-sm text-slate-500">
          Nenhuma comanda encontrada.
        </p>
      )}
    </section>
  );
}
