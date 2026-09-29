import { useState } from "react";
import { Plus, Table2 } from "lucide-react";

// MOCK inicial — depois você troca por dados da API
const MESAS_MOCK = [
  { id: 1, numero: "01", status: "livre", pedido: null, tempo: null },
  { id: 2, numero: "02", status: "ocupada", pedido: "#124", tempo: "32 min" },
  { id: 3, numero: "03", status: "ocupada", pedido: "#125", tempo: "15 min" },
  { id: 4, numero: "04", status: "livre", pedido: null, tempo: null },
  { id: 5, numero: "05", status: "reservada", pedido: null, tempo: "19:30" },
  { id: 6, numero: "06", status: "livre", pedido: null, tempo: null },
  { id: 7, numero: "07", status: "ocupada", pedido: "#126", tempo: "48 min" },
  { id: 8, numero: "08", status: "livre", pedido: null, tempo: null },
];

const STATUS_STYLE = {
  livre: {
    badge: "bg-green-100 text-green-700",
    borda: "border-green-200 hover:border-green-300",
    icone: "bg-green-50 text-green-600",
    label: "Livre",
  },
  ocupada: {
    badge: "bg-red-100 text-red-600",
    borda: "border-red-200 hover:border-red-300",
    icone: "bg-red-50 text-red-500",
    label: "Ocupada",
  },
  reservada: {
    badge: "bg-amber-100 text-amber-700",
    borda: "border-amber-200 hover:border-amber-300",
    icone: "bg-amber-50 text-amber-600",
    label: "Reservada",
  },
};

const FILTROS = [
  { id: "todas", label: "Todas" },
  { id: "livre", label: "Livres" },
  { id: "ocupada", label: "Ocupadas" },
  { id: "reservada", label: "Reservadas" },
];

export default function Mesas() {
  const [filtro, setFiltro] = useState("todas");

  const mesasFiltradas =
    filtro === "todas"
      ? MESAS_MOCK
      : MESAS_MOCK.filter((m) => m.status === filtro);

  return (
    <div className="min-h-full">
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mesas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Toque em uma mesa para ver detalhes
          </p>
        </div>

        <button
          type="button"
          onClick={() => console.log("Nova mesa")}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#ff5a47] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-95"
        >
          <Plus size={16} />
          Nova mesa
        </button>
      </div>

      {/* LEGENDA + FILTROS */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
              filtro === f.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="ml-auto hidden items-center gap-3 text-[11px] font-medium text-slate-500 lg:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Livre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Ocupada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Reservada
          </span>
        </div>
      </div>

      {/* GRID DE MESAS */}
      <div className="mt-5">
        {mesasFiltradas.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
            <p className="text-sm text-slate-400">
              Nenhuma mesa com esse status.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {mesasFiltradas.map((mesa) => {
              const estilo = STATUS_STYLE[mesa.status] ?? STATUS_STYLE.livre;

              return (
                <button
                  key={mesa.id}
                  type="button"
                  // 👉 AÇÃO ao clicar na mesa — troque pelo que você precisar
                  onClick={() => console.log("Mesa clicada:", mesa.numero)}
                  className={`cursor-pointer rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${estilo.borda}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      Mesa {mesa.numero}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${estilo.badge}`}
                    >
                      {estilo.label}
                    </span>
                  </div>

                  <div
                    className={`mt-3 flex h-16 items-center justify-center rounded-xl ${estilo.icone}`}
                  >
                    <Table2 size={28} />
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500">
                    {mesa.status === "livre" ? (
                      <p>Disponível</p>
                    ) : (
                      <>
                        {mesa.pedido && (
                          <p className="font-semibold text-slate-700">
                            Pedido {mesa.pedido}
                          </p>
                        )}
                        {mesa.tempo && <p>{mesa.tempo}</p>}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
