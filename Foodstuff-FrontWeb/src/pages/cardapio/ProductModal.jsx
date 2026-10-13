import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

function toForm(initialData) {
  return {
    name: initialData?.name ?? "",
    category_id: initialData?.category_id
      ? String(initialData.category_id)
      : "",
    price:
      initialData?.price !== undefined && initialData?.price !== null
        ? String(initialData.price)
        : "",
    cost:
      initialData?.cost !== undefined && initialData?.cost !== null
        ? String(initialData.cost)
        : "",
    description: initialData?.description ?? "",
    image: initialData?.image ?? "",
    requires_preparation: initialData
      ? Number(initialData.requires_preparation ?? 1) === 1
      : true,
    is_available: initialData
      ? Number(initialData.is_available ?? 1) === 1
      : true,
  };
}

export default function ProductModal({
  initialData,
  categorias,
  salvando,
  onClose,
  onSubmit,
  onOpenCategoryModal,
}) {
  const editando = Boolean(initialData?.product_id);
  const [form, setForm] = useState(() => toForm(initialData));
  const [erro, setErro] = useState(null);
  const [previewErro, setPreviewErro] = useState(false);

  useEffect(() => {
    function aoEsc(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", aoEsc);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoEsc);
      document.body.style.overflow = anterior;
    };
  }, [onClose]);

  useEffect(() => {
    setPreviewErro(false);
  }, [form.image]);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);

    if (!form.name.trim()) {
      setErro("Informe o nome do produto.");
      return;
    }

    if (!form.category_id) {
      setErro("Selecione a categoria do produto.");
      return;
    }

    const price = Number(String(form.price).replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      setErro("Informe um preço válido (0 ou maior).");
      return;
    }

    let cost = null;
    if (String(form.cost).trim() !== "") {
      cost = Number(String(form.cost).replace(",", "."));
      if (!Number.isFinite(cost) || cost < 0) {
        setErro("Informe um custo válido ou deixe em branco.");
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      category_id: Number(form.category_id),
      price,
      cost,
      description: form.description.trim() === "" ? null : form.description.trim(),
      image: form.image.trim() === "" ? null : form.image.trim(),
      requires_preparation: form.requires_preparation ? 1 : 0,
      is_available: form.is_available ? 1 : 0,
    };

    await onSubmit(payload);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <div className="mr-auto">
            <h3 className="text-[16px] font-bold text-slate-900">
              {editando ? "Editar item do cardápio" : "Adicionar novo item"}
            </h3>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {editando
                ? "Ajuste preço, descrição e disponibilidade. O histórico de pedidos é mantido."
                : "O item aparece no cardápio do cliente e do garçom. Sem controle de estoque."}
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

        <form onSubmit={handleSubmit} className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="block sm:col-span-1">
            <span className="mb-1 block text-[12px] font-semibold text-slate-700">
              Nome do prato *
            </span>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Burger FoodStuff Duplo"
              maxLength={150}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-[#ff5a47]"
            />
          </label>

          <div className="block sm:col-span-1">
            <span className="mb-1 flex items-center justify-between text-[12px] font-semibold text-slate-700">
              Categoria *
              {onOpenCategoryModal && (
                <button
                  type="button"
                  onClick={onOpenCategoryModal}
                  className="cursor-pointer text-[11px] font-semibold text-[#ff5a47] hover:underline"
                >
                  + Nova
                </button>
              )}
            </span>
            <select
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-[#ff5a47]"
            >
              <option value="">Selecione...</option>
              {categorias.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-slate-700">
              Preço de venda (R$) *
            </span>
            <input
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="42,90"
              inputMode="decimal"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-[#ff5a47]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-slate-700">
              Custo (opcional, interno)
            </span>
            <input
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
              placeholder="18,50"
              inputMode="decimal"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-[#ff5a47]"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[12px] font-semibold text-slate-700">
              Descrição
            </span>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Descreva ingredientes e preparo para o cliente..."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#ff5a47]"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[12px] font-semibold text-slate-700">
              URL da imagem
            </span>
            <input
              value={form.image}
              onChange={(e) => set("image", e.target.value)}
              placeholder="https://..."
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-[#ff5a47]"
            />
            {form.image.trim() !== "" && !previewErro ? (
              <img
                src={form.image.trim()}
                alt="Pré-visualização"
                onError={() => setPreviewErro(true)}
                className="mt-2 h-36 w-full rounded-xl border border-slate-200 object-cover"
              />
            ) : form.image.trim() !== "" && previewErro ? (
              <p className="mt-1 text-[11px] text-amber-600">
                Não foi possível carregar a pré-visualização desta URL.
              </p>
            ) : null}
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={form.requires_preparation}
              onChange={(e) => set("requires_preparation", e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[#ff5a47]"
            />
            <span>
              <span className="block text-[12px] font-semibold text-slate-800">
                Precisa de preparo na cozinha
              </span>
              <span className="block text-[11px] text-slate-500">
                Desmarque para bebidas prontas e itens diretos.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => set("is_available", e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-[#ff5a47]"
            />
            <span>
              <span className="block text-[12px] font-semibold text-slate-800">
                Disponível no cardápio
              </span>
              <span className="block text-[11px] text-slate-500">
                Controle manual, sem vínculo com estoque.
              </span>
            </span>
          </label>

          {erro && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700 sm:col-span-2">
              {erro}
            </p>
          )}

          {categorias.length === 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 sm:col-span-2">
              Nenhuma categoria ativa encontrada. Cadastre categorias no banco
              (tabela `categories`) para organizar o cardápio.
            </p>
          )}

          <div className="flex justify-end gap-2 sm:col-span-2">
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
                  ? "Salvar alterações"
                  : "Criar item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
