import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  LayoutGrid,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Search,
  Tag,
  UtensilsCrossed,
} from "lucide-react";

import api from "../../services/axios";
import Snackbar from "../../components/snackBar/SnackBar";
import ProductModal from "./ProductModal";
import CategoryModal from "./CategoryModal";

const CATEGORIAS_PADRAO = [
  { name: "Entradas", description: "Porções, bruschettas e entradas" },
  { name: "Pizzas", description: "Pizzas tradicionais e especiais" },
  { name: "Massas", description: "Massas artesanais e molhos" },
  { name: "Pratos Principais", description: "Pratos principais da casa" },
  { name: "Lanches", description: "Burgers, lanches e sanduíches" },
  { name: "Saladas", description: "Saladas frescas" },
  { name: "Bebidas", description: "Refrigerantes, sucos e sodas" },
  { name: "Sobremesas", description: "Doces e sobremesas" },
];

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") ?? "null") ?? {};
  } catch {
    return {};
  }
}

function isManagerRole(role) {
  return role === "MANAGER";
}

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getApiMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function getListFromResponse(response) {
  const data = response?.data?.data ?? response?.data;
  return Array.isArray(data) ? data : [];
}

function normalizarProdutos(lista) {
  return lista.map((p) => ({
    product_id: p.product_id,
    name: p.name ?? "Sem nome",
    description: p.description ?? "",
    price: Number(p.price ?? 0),
    cost: p.cost === null || p.cost === undefined ? null : Number(p.cost),
    image: p.image ?? null,
    requires_preparation: Number(p.requires_preparation ?? 1),
    is_available: Number(p.is_available ?? 1),
    is_active: Number(p.is_active ?? 1),
    category_id: p.category_id,
    category_name: p.category_name ?? "Sem categoria",
  }));
}

export default function Cardapio() {
  const user = getStoredUser();
  const isManager = isManagerRole(user.role);

  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [snackbar, setSnackbar] = useState(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletandoId, setDeletandoId] = useState(null);

  const [categoriaModalAberto, setCategoriaModalAberto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [deletandoCategoria, setDeletandoCategoria] = useState(false);
  const [populandoCategorias, setPopulandoCategorias] = useState(false);

  async function recarregarCategorias() {
    const res = await api.getAllCategories();
    setCategorias(getListFromResponse(res));
  }

  async function carregarTudo() {
    try {
      setCarregando(true);
      const [resProdutos, resCategorias] = await Promise.all([
        api.getAllProducts(),
        api.getAllCategories().catch(() => ({ data: { data: [] } })),
      ]);

      setProdutos(normalizarProdutos(getListFromResponse(resProdutos)));
      setCategorias(getListFromResponse(resCategorias));
    } catch (error) {
      setSnackbar({
        message: getApiMessage(error, "Erro ao buscar o cardápio."),
        type: "error",
      });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let montado = true;

    async function init() {
      await carregarTudo();
      if (!montado) return;
    }

    init();

    return () => {
      montado = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const ativos = produtos.filter((p) => p.is_active === 1);
    const indisponiveis = ativos.filter((p) => p.is_available === 0).length;

    const porCategoria = new Map();
    ativos.forEach((p) => {
      porCategoria.set(
        p.category_name,
        (porCategoria.get(p.category_name) ?? 0) + 1,
      );
    });

    let destaque = "—";
    let max = 0;
    porCategoria.forEach((qtd, nome) => {
      if (qtd > max) {
        max = qtd;
        destaque = nome;
      }
    });

    return {
      total: ativos.length,
      totalCategorias: categorias.length,
      indisponiveis,
      destaque,
    };
  }, [produtos, categorias]);

  const filtrados = useMemo(() => {
    let lista = produtos.filter((p) => p.is_active === 1);

    if (filtroCategoria !== "TODOS") {
      lista = lista.filter(
        (p) => String(p.category_id) === String(filtroCategoria),
      );
    }

    const termo = busca.trim().toLowerCase();
    if (termo) {
      lista = lista.filter(
        (p) =>
          p.name.toLowerCase().includes(termo) ||
          (p.description ?? "").toLowerCase().includes(termo),
      );
    }

    return lista;
  }, [produtos, filtroCategoria, busca]);

  function abrirCriacao() {
    if (!isManager) {
      setSnackbar({
        message: "Apenas gerentes podem criar produtos.",
        type: "warning",
      });
      return;
    }
    setEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(produto) {
    if (!isManager) return;
    setEditando(produto);
    setModalAberto(true);
  }

  async function handleSalvar(form) {
    try {
      setSalvando(true);

      if (editando) {
        const res = await api.patchProduct(editando.product_id, form);
        setSnackbar({
          message: res?.data?.message || "Produto atualizado com sucesso.",
          type: "success",
        });
      } else {
        const res = await api.postProduct(form);
        setSnackbar({
          message: res?.data?.message || "Produto criado com sucesso.",
          type: "success",
        });
      }

      setModalAberto(false);
      setEditando(null);
      await carregarTudo();
    } catch (error) {
      setSnackbar({
        message: getApiMessage(error, "Erro ao salvar produto."),
        type: "error",
      });
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggleDisponibilidade(produto) {
    if (!isManager) return;

    try {
      setTogglingId(produto.product_id);
      const novoValor = produto.is_available === 1 ? 0 : 1;
      const res = await api.patchProductAvailability(
        produto.product_id,
        novoValor,
      );

      setProdutos((atual) =>
        atual.map((p) =>
          p.product_id === produto.product_id
            ? { ...p, is_available: novoValor }
            : p,
        ),
      );
      setSnackbar({
        message: res?.data?.message || "Disponibilidade atualizada.",
        type: "success",
      });
    } catch (error) {
      setSnackbar({
        message: getApiMessage(error, "Erro ao alterar disponibilidade."),
        type: "error",
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleExcluir(produto) {
    if (!isManager) return;

    const confirmar = window.confirm(
      `Deseja realmente desativar "${produto.name}" do cardápio? Ele sairá da visão do cliente e do garçom, mas o histórico de pedidos será mantido.`,
    );
    if (!confirmar) return;

    try {
      setDeletandoId(produto.product_id);
      const res = await api.deleteProduct(produto.product_id);
      setProdutos((atual) =>
        atual.filter((p) => p.product_id !== produto.product_id),
      );
      setSnackbar({
        message: res?.data?.message || "Produto desativado com sucesso.",
        type: "success",
      });
    } catch (error) {
      setSnackbar({
        message: getApiMessage(error, "Erro ao desativar produto."),
        type: "error",
      });
    } finally {
      setDeletandoId(null);
    }
  }

  function abrirNovaCategoria() {
    if (!isManager) {
      setSnackbar({
        message: "Apenas gerentes podem criar categorias.",
        type: "warning",
      });
      return;
    }
    setCategoriaEditando(null);
    setCategoriaModalAberto(true);
  }

  async function handleSalvarCategoria(form) {
    try {
      setSalvandoCategoria(true);

      if (categoriaEditando) {
        const res = await api.patchCategory(
          categoriaEditando.category_id,
          form,
        );
        setSnackbar({
          message: res?.data?.message || "Categoria atualizada com sucesso.",
          type: "success",
        });
      } else {
        const res = await api.postCategory(form);
        setSnackbar({
          message: res?.data?.message || "Categoria criada com sucesso.",
          type: "success",
        });
      }

      setCategoriaModalAberto(false);
      setCategoriaEditando(null);
      await recarregarCategorias();
    } catch (error) {
      setSnackbar({
        message: getApiMessage(error, "Erro ao salvar categoria."),
        type: "error",
      });
    } finally {
      setSalvandoCategoria(false);
    }
  }

  async function handleExcluirCategoria() {
    if (!categoriaEditando) return;

    const confirmar = window.confirm(
      `Deseja realmente desativar a categoria "${categoriaEditando.name}"?`,
    );
    if (!confirmar) return;

    try {
      setDeletandoCategoria(true);
      const res = await api.deleteCategory(categoriaEditando.category_id);
      setCategoriaModalAberto(false);
      setCategoriaEditando(null);
      setFiltroCategoria("TODOS");
      await recarregarCategorias();
      setSnackbar({
        message: res?.data?.message || "Categoria desativada com sucesso.",
        type: "success",
      });
    } catch (error) {
      setSnackbar({
        message: getApiMessage(error, "Erro ao desativar categoria."),
        type: "error",
      });
    } finally {
      setDeletandoCategoria(false);
    }
  }

  async function handlePopularPadrao() {
    if (!isManager || populandoCategorias) return;

    try {
      setPopulandoCategorias(true);
      let criadas = 0;

      for (const cat of CATEGORIAS_PADRAO) {
        try {
          await api.postCategory(cat);
          criadas += 1;
        } catch (error) {
          if (error?.response?.status !== 409) throw error;
        }
      }

      await recarregarCategorias();
      setSnackbar({
        message:
          criadas > 0
            ? `${criadas} categorias padrão cadastradas.`
            : "Categorias padrão já existiam.",
        type: "success",
      });
    } catch (error) {
      setSnackbar({
        message: getApiMessage(error, "Erro ao popular categorias."),
        type: "error",
      });
    } finally {
      setPopulandoCategorias(false);
    }
  }

  return (
    <div className="min-h-full">
      {snackbar && (
        <Snackbar
          isOpen={true}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}

      {/* CABEÇALHO */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h2 className="text-xl font-bold text-slate-900">
            Gerenciamento de Cardápio
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Adicione pratos, configure preços, ajuste descrições e controle a
            disponibilidade.
          </p>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={abrirCriacao}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#ff5a47] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            <Plus size={16} />
            Adicionar Novo Item
          </button>
        )}
      </div>

      {!isManager && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Visão de cardápio. Apenas gerentes podem criar, editar ou desativar
          itens.
        </div>
      )}

      {/* STATS */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-600">Total de Itens</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-[#ff5a47]">
              <BookOpen size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats.total} pratos
          </p>
          <p className="mt-1 text-[12px] font-medium text-emerald-500">
            {stats.total - stats.indisponiveis} disponíveis no cardápio
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-600">Categorias</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-[#ff5a47]">
              <LayoutGrid size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats.totalCategorias} Categorias
          </p>
          <p className="mt-1 text-[12px] font-medium text-emerald-500">
            Destaque para {stats.destaque}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-600">Itens Indisponíveis</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-[#ff5a47]">
              <EyeOff size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats.indisponiveis} Itens
          </p>
          <p className="mt-1 text-[12px] font-medium text-red-500">
            Controle manual de disponibilidade
          </p>
        </div>
      </div>

      {/* FILTROS + BUSCA */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFiltroCategoria("TODOS")}
          className={`cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
            filtroCategoria === "TODOS"
              ? "bg-[#ff5a47] text-white shadow-sm"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          Todos
        </button>

        {categorias.map((c) => (
          <button
            key={c.category_id}
            type="button"
            onClick={() => setFiltroCategoria(String(c.category_id))}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
              String(filtroCategoria) === String(c.category_id)
                ? "bg-[#ff5a47] text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {c.name}
          </button>
        ))}

        {isManager && (
          <>
            <button
              type="button"
              onClick={abrirNovaCategoria}
              title="Nova categoria"
              className="flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-500 transition hover:border-[#ff5a47] hover:text-[#ff5a47]"
            >
              <Plus size={14} />
              Categoria
            </button>

            {filtroCategoria !== "TODOS" && (
              <button
                type="button"
                title="Editar categoria filtrada"
                onClick={() => {
                  const atual = categorias.find(
                    (c) => String(c.category_id) === String(filtroCategoria),
                  );
                  if (atual) {
                    setCategoriaEditando(atual);
                    setCategoriaModalAberto(true);
                  }
                }}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                <Pencil size={13} />
              </button>
            )}

            {categorias.length === 0 && (
              <button
                type="button"
                onClick={handlePopularPadrao}
                disabled={populandoCategorias}
                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {populandoCategorias ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <LayoutGrid size={13} />
                )}
                {populandoCategorias
                  ? "Populando..."
                  : "Popular categorias padrão"}
              </button>
            )}
          </>
        )}

        <div className="relative ml-auto w-full sm:w-72">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pratos ou ingredientes..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#ff5a47]"
          />
        </div>
      </div>

      {/* GRID */}
      <div className="mt-5">
        {carregando ? (
          <div className="flex h-48 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Carregando cardápio...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
            <UtensilsCrossed size={22} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              Nenhum item encontrado.
            </p>
            <p className="max-w-sm text-[12px] text-slate-400">
              {categorias.length === 0
                ? "Use o botão Popular categorias padrão ou crie uma categoria para montar o cardápio."
                : "Ajuste o filtro ou a busca, ou cadastre um novo item."}
            </p>
            {isManager && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {categorias.length === 0 && (
                  <button
                    type="button"
                    onClick={handlePopularPadrao}
                    disabled={populandoCategorias}
                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    {populandoCategorias ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <LayoutGrid size={14} />
                    )}
                    {populandoCategorias
                      ? "Populando..."
                      : "Popular categorias padrão"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={abrirCriacao}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#ff5a47] px-4 py-2 text-[12px] font-semibold text-white hover:brightness-95"
                >
                  <Plus size={14} />
                  Adicionar Novo Item
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filtrados.map((p) => {
              const disponivel = p.is_available === 1;
              return (
                <article
                  key={p.product_id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div
                    className="h-44 w-full overflow-hidden bg-slate-100 cursor-pointer"
                    onClick={() => abrirEdicao(p)}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-full w-full object-cover "
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                        <UtensilsCrossed size={28} />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {p.category_name}
                      </span>
                      <span
                        className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                          disponivel ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            disponivel ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {disponivel ? "Disponível" : "Indisponível"}
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-[15px] font-bold text-slate-900">
                      {p.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 min-h-[36px] text-[12px] leading-5 text-slate-500">
                      {p.description || "Sem descrição cadastrada."}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[15px] font-bold text-slate-900">
                        {formatarMoeda(p.price)}
                      </span>

                      {isManager && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => abrirEdicao(p)}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title={
                              disponivel
                                ? "Marcar indisponível"
                                : "Marcar disponível"
                            }
                            disabled={togglingId === p.product_id}
                            onClick={() => handleToggleDisponibilidade(p)}
                            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition disabled:opacity-60 ${
                              disponivel
                                ? "bg-red-50 text-red-500 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            }`}
                          >
                            {togglingId === p.product_id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Tag size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Desativar do cardápio"
                            disabled={deletandoId === p.product_id}
                            onClick={() => handleExcluir(p)}
                            className="flex h-8 cursor-pointer items-center rounded-lg bg-red-50 px-2 text-[11px] font-semibold text-red-500 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            {deletandoId === p.product_id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              "Excluir"
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {modalAberto && (
        <ProductModal
          initialData={editando}
          categorias={categorias}
          salvando={salvando}
          onClose={() => {
            setModalAberto(false);
            setEditando(null);
          }}
          onSubmit={handleSalvar}
          onOpenCategoryModal={abrirNovaCategoria}
        />
      )}

      {categoriaModalAberto && (
        <CategoryModal
          initialData={categoriaEditando}
          salvando={salvandoCategoria}
          deletando={deletandoCategoria}
          onClose={() => {
            setCategoriaModalAberto(false);
            setCategoriaEditando(null);
          }}
          onSubmit={handleSalvarCategoria}
          onDelete={categoriaEditando ? handleExcluirCategoria : undefined}
        />
      )}
    </div>
  );
}
