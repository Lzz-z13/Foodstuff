import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, UsersRound } from "lucide-react";

import api from "../../../services/axios";
import Snackbar from "../../../components/snackBar/SnackBar";

const CARGOS = [
  { valor: "MANAGER", label: "Gerente" },
  { valor: "WAITER", label: "Garçom" },
  { valor: "KITCHEN", label: "Cozinha" },
  { valor: "CASHIER", label: "Caixa" },
];

const CARGO_LABEL = Object.fromEntries(CARGOS.map((c) => [c.valor, c.label]));

const CARGO_BADGE = {
  MANAGER: "bg-red-50 text-red-600",
  WAITER: "bg-blue-50 text-blue-600",
  KITCHEN: "bg-amber-50 text-amber-600",
  CASHIER: "bg-green-50 text-green-600",
};

const INPUT =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ff5a47]";

function AvatarEquipe({ usuario, className }) {
  const [fotoComErro, setFotoComErro] = useState(null);

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 font-bold text-slate-600 ${className}`}>
      {usuario.photo && usuario.photo !== fotoComErro ? (
        <img
          src={usuario.photo}
          alt={`Foto de ${usuario.name || "usuário"}`}
          className="h-full w-full object-cover"
          onError={() => setFotoComErro(usuario.photo)}
        />
      ) : (
        usuario.name?.trim().charAt(0).toUpperCase() || "?"
      )}
    </span>
  );
}

export default function Equipe() {
  const eu = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") ?? "null") ?? {};
    } catch {
      return {};
    }
  }, []);

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", cargo: "WAITER" });
  const [salvando, setSalvando] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  async function carregar() {
    try {
      setCarregando(true);
      setSemPermissao(false);
      const response = await api.getAllUsers();
      setUsuarios(response.data.data ?? []);
    } catch (error) {
      if (error?.response?.status === 403) {
        setSemPermissao(true);
      } else {
        setSnackbar({
          message: error?.response?.data?.message || "Erro ao carregar a equipe.",
          type: "error",
        });
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        u.name?.toLowerCase().includes(termo) ||
        u.email?.toLowerCase().includes(termo),
    );
  }, [usuarios, busca]);

  const selecionado = usuarios.find((u) => u.user_id === selecionadoId) ?? null;
  const eMinhaConta = selecionado && selecionado.user_id === eu.user_id;

  function selecionar(usuario) {
    setSelecionadoId(usuario.user_id);
    setForm({
      nome: usuario.name ?? "",
      email: usuario.email ?? "",
      telefone: usuario.phone ?? "",
      cargo: usuario.role ?? "WAITER",
    });
  }

  async function salvar(e) {
    e.preventDefault();
    if (!selecionado || eMinhaConta) return;

    const payload = {};
    const nome = form.nome.trim();
    const email = form.email.trim();
    const telefone = form.telefone.trim();

    if (nome && nome !== selecionado.name) payload.name = nome;
    if (email && email !== selecionado.email) payload.email = email;
    if (telefone && telefone !== selecionado.phone) payload.phone = telefone;
    if (form.cargo && form.cargo !== selecionado.role) payload.role = form.cargo;

    if (Object.keys(payload).length === 0) {
      setSnackbar({ message: "Nenhuma alteração para salvar.", type: "info" });
      return;
    }

    try {
      setSalvando(true);
      await api.patchUserById(selecionado.user_id, payload);
      setUsuarios((lista) =>
        lista.map((u) => (u.user_id === selecionado.user_id ? { ...u, ...payload } : u)),
      );
      setSnackbar({ message: "Usuário atualizado com sucesso.", type: "success" });
    } catch (error) {
      const status = error?.response?.status;
      const mensagem =
        error?.response?.data?.message ||
        (status === 404
          ? "Rota não encontrada no servidor. Reinicie a API para carregar o novo endpoint."
          : "Erro ao atualizar o usuário.");
      setSnackbar({
        message: status ? `Erro ${status}: ${mensagem}` : mensagem,
        type: "error",
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 md:px-6">
      {snackbar && (
        <Snackbar
          isOpen={true}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}

      <div className="mt-4 mb-5 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5a47] text-white">
          <UsersRound size={18} />
        </span>
        <div className="mr-auto">
          <h1 className="text-lg font-bold text-slate-900">Equipe</h1>
          <p className="text-[12px] text-slate-500">
            {usuarios.length} usuário(s) cadastrado(s) no sistema
          </p>
        </div>
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="h-10 w-64 rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#ff5a47]"
          />
        </div>
      </div>

      {semPermissao ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-[14px] font-bold text-slate-900">Acesso restrito</p>
          <p className="mt-1 text-[12px] text-slate-500">
            Apenas gerentes podem visualizar e gerenciar a equipe.
          </p>
        </div>
      ) : carregando ? (
        <p className="py-10 text-center text-[13px] text-slate-500">Carregando equipe...</p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {filtrados.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-slate-500">
                Nenhum usuário encontrado.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtrados.map((u) => {
                  const ativo = u.user_id === selecionadoId;
                  return (
                    <li key={u.user_id}>
                      <button
                        type="button"
                        onClick={() => selecionar(u)}
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${ativo ? "bg-red-50/50" : ""}`}
                      >
                        <AvatarEquipe usuario={u} className="h-10 w-10 text-[14px]" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[13px] font-semibold text-slate-800">
                              {u.name}
                            </span>
                            <span
                              className={`rounded px-1.5 py-px text-[10px] font-bold ${CARGO_BADGE[u.role] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {CARGO_LABEL[u.role] ?? u.role}
                            </span>
                            {Number(u.first_login) === 1 && (
                              <span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-bold text-amber-700">
                                PRIMEIRO ACESSO
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-[11px] text-slate-400">
                            {u.email}
                          </span>
                        </span>
                        <ChevronRight size={16} className="shrink-0 text-slate-300" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selecionado ? (
              <p className="py-6 text-center text-[13px] text-slate-500">
                Clique em um usuário da lista para ver e editar as informações.
              </p>
            ) : (
              <form onSubmit={salvar} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <AvatarEquipe key={selecionado.user_id} usuario={selecionado} className="h-14 w-14 text-[20px]" />
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-bold text-slate-900">
                      {selecionado.name}
                    </h2>
                    <p className="truncate text-[11px] text-slate-400">{selecionado.email}</p>
                  </div>
                </div>

                {eMinhaConta && (
                  <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-700">
                    Esta é a sua conta — edite seus dados em Minha Conta.
                  </p>
                )}

                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-slate-800">Nome</span>
                  <input
                    value={form.nome}
                    disabled={eMinhaConta}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className={`${INPUT} disabled:cursor-not-allowed disabled:bg-slate-50`}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-slate-800">E-mail</span>
                  <input
                    type="email"
                    value={form.email}
                    disabled={eMinhaConta}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`${INPUT} disabled:cursor-not-allowed disabled:bg-slate-50`}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-slate-800">Telefone</span>
                  <input
                    value={form.telefone}
                    disabled={eMinhaConta}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    className={`${INPUT} disabled:cursor-not-allowed disabled:bg-slate-50`}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-slate-800">Cargo</span>
                  <div className="relative">
                    <select
                      value={form.cargo}
                      disabled={eMinhaConta}
                      onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                      className={`${INPUT} cursor-pointer appearance-none pr-9 disabled:cursor-not-allowed disabled:bg-slate-50`}
                    >
                      {CARGOS.map((c) => (
                        <option key={c.valor} value={c.valor}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-600"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Ex.: garçom promovido a caixa — basta trocar aqui e salvar.
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={salvando || eMinhaConta}
                    className="rounded-lg bg-[#ff5a47] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm disabled:opacity-60"
                  >
                    {salvando ? "Salvando..." : "Salvar alterações"}
                  </button>
                  <button
                    type="button"
                    onClick={() => selecionar(selecionado)}
                    className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700"
                  >
                    Desfazer
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
