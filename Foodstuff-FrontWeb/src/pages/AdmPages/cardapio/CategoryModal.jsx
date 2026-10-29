import { useState } from "react";
import { Loader2, X } from "lucide-react";

export default function CategoryModal({
  initialData,
  salvando,
  deletando,
  onClose,
  onSubmit,
  onDelete,
}) {
  const editando = Boolean(initialData?.category_id);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [erro, setErro] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);

    if (!name.trim()) {
      setErro("Informe o nome da categoria.");
      return;
    }

    await onSubmit({
      name: name.trim(),
      description:
        description.trim() === "" ? null : description.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <div className="mr-auto">
            <h3 className="text-[15px] font-bold text-slate-900">
              {editando ? "Editar categoria" : "Nova categoria"}
            </h3>
            <p className="mt-0.5 text-[12px] text-slate-500">
              As categorias organizam o cardápio do cliente e do garçom.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 p-5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-slate-700">
              Nome *
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pizzas"
              maxLength={100}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-[#ff5a47]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-slate-700">
              Descrição (opcional)
            </span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pizzas tradicionais e especiais"
              maxLength={255}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-[#ff5a47]"
            />
          </label>

          {erro && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
              {erro}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <div>
              {editando && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={salvando || deletando}
                  className="cursor-pointer rounded-xl px-3 py-2.5 text-[12px] font-semibold text-red-500 hover:bg-red-50 disabled:opacity-60"
                >
                  {deletando ? "Excluindo..." : "Excluir"}
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={salvando}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#ff5a47] px-5 py-2.5 text-[13px] font-semibold text-white hover:brightness-95 disabled:opacity-60"
              >
                {salvando && <Loader2 size={15} className="animate-spin" />}
                {salvando
                  ? "Salvando..."
                  : editando
                    ? "Salvar"
                    : "Criar categoria"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
