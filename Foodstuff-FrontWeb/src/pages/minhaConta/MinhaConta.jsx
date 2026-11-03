import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

import api from "../../services/axios";
import Snackbar from "../../components/snackBar/SnackBar";

const CARGO_LABELS = {
  MANAGER: "Gerente",
  WAITER: "Garçom",
  KITCHEN: "Cozinha",
  CASHIER: "Caixa",
};

const INPUT =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#ff5a47]";

function lerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("user") ?? "null") ?? {};
  } catch {
    return {};
  }
}

function detectarDispositivo() {
  const ua = navigator.userAgent ?? "";
  const navegador = navigator.brave
    ? "Brave"
    : ua.includes("Edg")
      ? "Edge"
      : ua.includes("Firefox")
        ? "Firefox"
        : ua.includes("Chrome")
          ? "Chrome"
          : ua.includes("Safari")
            ? "Safari"
            : "Navegador";

  const sistema = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS")
      ? "macOS"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone") || ua.includes("iPad")
          ? "iOS"
          : ua.includes("Linux")
            ? "Linux"
            : "este dispositivo";

  return `${navegador} no ${sistema}`;
}

function chaveSessoes(usuario) {
  return `sessions:${usuario.user_id ?? usuario.email ?? "anon"}`;
}

function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}

function CampoSenha({ label, ...props }) {
  return (
    <Campo label={label}>
      <div className="relative">
        <Lock
          size={14}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
        />
        <input type="password" className={`${INPUT} pl-9`} {...props} />
      </div>
    </Campo>
  );
}

function Toggle({ ligado, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${ligado ? "bg-[#ff5a47]" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${ligado ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

export default function Conta() {
  const [usuario, setUsuario] = useState(() => lerUsuario());
  const perfilAnterior = useRef(usuario);
  const [dados, setDados] = useState({
    nome: usuario.name ?? "",
    email: usuario.email ?? "",
    telefone: usuario.phone ?? "",
  });
  useEffect(() => {
    function atualizarPerfil() {
      const atual = lerUsuario();
      setUsuario(atual);
      const anterior = perfilAnterior.current;
      setDados(previous => {
        return {
          nome: previous.nome === (anterior.name ?? "") ? (atual.name ?? "") : previous.nome,
          email: previous.email === (anterior.email ?? "") ? (atual.email ?? "") : previous.email,
          telefone: previous.telefone === (anterior.phone ?? "") ? (atual.phone ?? "") : previous.telefone,
        };
      });
      perfilAnterior.current = atual;
    }
    window.addEventListener("userUpdated", atualizarPerfil);
    window.addEventListener("storage", atualizarPerfil);
    return () => {
      window.removeEventListener("userUpdated", atualizarPerfil);
      window.removeEventListener("storage", atualizarPerfil);
    };
  }, []);
  const [senha, setSenha] = useState({ atual: "", nova: "", confirmar: "" });
  const [notificacoes, setNotificacoes] = useState({
    email: true,
    push: true,
    sms: false,
  });
  const [sessoes, setSessoes] = useState([]);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const arquivoFotoRef = useRef(null);
  const [snackbar, setSnackbar] = useState(null);

  const cargoLabel = CARGO_LABELS[usuario.role] ?? "—";
  const primeiroAcesso = Number(usuario.first_login) === 1;

  // Registra a sessão atual (navegador + SO) no armazenamento local, sem
  // depender de endpoint de sessões — a API não possui tabela/rota de sessão.
  useEffect(() => {
    const chave = chaveSessoes(usuario);
    let anteriores = [];
    try {
      anteriores = JSON.parse(localStorage.getItem(chave) ?? "[]");
      if (!Array.isArray(anteriores)) anteriores = [];
    } catch {
      anteriores = [];
    }

    const atual = {
      id: "atual",
      dispositivo: detectarDispositivo(),
      detalhe: "Esta sessão",
      atual: true,
      quando: "Ativo agora",
    };

    const outras = anteriores
      .filter((s) => s && s.id !== "atual")
      .map((s) => ({ ...s, atual: false }));
    const lista = [atual, ...outras].slice(0, 5);

    localStorage.setItem(chave, JSON.stringify(lista));
    setSessoes(lista);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atualizarDados = (campo) => (e) =>
    setDados({ ...dados, [campo]: e.target.value });
  const atualizarSenha = (campo) => (e) =>
    setSenha({ ...senha, [campo]: e.target.value });
  const alternar = (campo) =>
    setNotificacoes({ ...notificacoes, [campo]: !notificacoes[campo] });

  const NOTIFICACOES = [
    {
      id: "email",
      titulo: "Notificações por E-mail",
      descricao: "Receber relatórios diários e alertas de faturamento.",
    },
    {
      id: "push",
      titulo: "Alertas Push (Navegador)",
      descricao: "Notificações instantâneas de novos pedidos e KDS.",
    },
    {
      id: "sms",
      titulo: "Alertas SMS",
      descricao: "Apenas em casos urgentes ou indisponibilidade de mesa.",
    },
  ];

  async function alterarFoto(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || salvandoFoto) return;

    if (!["image/jpeg", "image/png"].includes(arquivo.type)) {
      setSnackbar({
        message: "Selecione uma imagem JPG ou PNG.",
        type: "warning",
      });
      return;
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      setSnackbar({
        message: "A foto deve ter no máximo 2 MB.",
        type: "warning",
      });
      return;
    }

    setSalvandoFoto(true);
    try {
      const photo = await new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = () =>
          reject(new Error("Não foi possível ler a imagem."));
        leitor.onabort = () =>
          reject(new Error("A leitura da imagem foi cancelada."));
        leitor.readAsDataURL(arquivo);
      });
      const response = await api.patchMePhoto(photo);
      const atualizado = { ...lerUsuario(), photo: response.data.data.photo };
      setUsuario(atualizado);
      localStorage.setItem("user", JSON.stringify(atualizado));
      window.dispatchEvent(new Event("userUpdated"));
      setSnackbar({ message: "Foto atualizada com sucesso.", type: "success" });
    } catch (error) {
      setSnackbar({
        message:
          error?.response?.data?.message ||
          "Não foi possível atualizar a foto. Tente novamente.",
        type: "error",
      });
    } finally {
      setSalvandoFoto(false);
    }
  }

  async function salvarDados(e) {
    e.preventDefault();

    const payload = {};
    const nome = dados.nome.trim();
    const email = dados.email.trim();
    const telefone = dados.telefone.trim();

    if (nome && nome !== (usuario.name ?? "")) payload.name = nome;
    if (email && email !== (usuario.email ?? "")) payload.email = email;
    if (telefone && telefone !== (usuario.phone ?? ""))
      payload.phone = telefone;

    if (Object.keys(payload).length === 0) {
      setSnackbar({ message: "Nenhuma alteração para salvar.", type: "info" });
      return;
    }

    try {
      setSalvandoDados(true);
      await api.patchMe(payload);

      const atualizado = { ...lerUsuario(), ...payload };
      localStorage.setItem("user", JSON.stringify(atualizado));
      window.dispatchEvent(new Event("userUpdated"));
      setUsuario(atualizado);
      setSnackbar({
        message: "Dados atualizados com sucesso.",
        type: "success",
      });
    } catch (error) {
      setSnackbar({
        message:
          error?.response?.data?.message || "Erro ao atualizar os dados.",
        type: "error",
      });
    } finally {
      setSalvandoDados(false);
    }
  }

  async function salvarSenha(e) {
    e.preventDefault();

    if (!senha.atual || !senha.nova || !senha.confirmar) {
      setSnackbar({
        message: "Preencha todos os campos de senha.",
        type: "warning",
      });
      return;
    }

    if (senha.nova !== senha.confirmar) {
      setSnackbar({
        message: "A nova senha e a confirmação não conferem.",
        type: "warning",
      });
      return;
    }

    try {
      setSalvandoSenha(true);
      const response = await api.patchMePassword({
        current_password: senha.atual,
        new_password: senha.nova,
      });

      // A API zera o first_login e devolve um token novo — sem ele o usuário
      // continua bloqueado pelo verifyFirstLogin.
      if (response?.data?.token) {
        localStorage.setItem("token", response.data.token);
      }
      const atualizado = { ...lerUsuario(), first_login: 0 };
      localStorage.setItem("user", JSON.stringify(atualizado));
      window.dispatchEvent(new Event("userUpdated"));
      setUsuario(atualizado);
      setSenha({ atual: "", nova: "", confirmar: "" });
      setSnackbar({
        message: "Senha atualizada com sucesso.",
        type: "success",
      });
    } catch (error) {
      setSnackbar({
        message: error?.response?.data?.message || "Erro ao atualizar a senha.",
        type: "error",
      });
    } finally {
      setSalvandoSenha(false);
    }
  }

  function cancelar() {
    const atual = lerUsuario();
    setUsuario(atual);
    setDados({
      nome: atual.name ?? "",
      email: atual.email ?? "",
      telefone: atual.phone ?? "",
    });
    setSenha({ atual: "", nova: "", confirmar: "" });
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

      {primeiroAcesso && (
        <p className="mx-auto mt-4 max-w-5xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-medium text-amber-800">
          Primeiro acesso: troque sua senha abaixo para desbloquear o sistema.
          Ela precisa ter ao menos 8 caracteres, com maiúscula, minúscula e
          caractere especial.
        </p>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[1.45fr_1fr] lg:items-start">
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-900">
              Dados Pessoais
            </h2>
            <div className="mt-4 flex items-center gap-4">
              {usuario.photo ? (
                <img
                  src={usuario.photo}
                  alt="Foto de perfil"
                  className="h-[68px] w-[68px] shrink-0 rounded-full bg-gray-300 object-cover cursor-pointer"
                  onClick={() => arquivoFotoRef.current?.click()}
                />
              ) : (
                <img
                src="../public/foodstuff-icon.svg"
                  alt="Foto de perfil"
                  className="h-[68px] w-[68px] shrink-0 rounded-full bg-gray-300 object-cover cursor-pointer"
                  onClick={() => arquivoFotoRef.current?.click()}
                />
              )}
              <div>
                <input
                  ref={arquivoFotoRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  aria-label="Selecionar foto de perfil"
                  className="hidden"
                  onChange={alterarFoto}
                  disabled={salvandoFoto || primeiroAcesso}
                />
                <button
                  type="button"
                  onClick={() => arquivoFotoRef.current?.click()}
                  disabled={salvandoFoto || primeiroAcesso}
                  aria-busy={salvandoFoto}
                  className="cursor-pointer rounded-md bg-[#ff5a47] px-4 py-1.5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {salvandoFoto ? "Salvando foto..." : "Alterar Foto"}
                </button>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  {primeiroAcesso
                    ? "Troque sua senha para alterar a foto."
                    : "JPG ou PNG de até 2 MB. Salva automaticamente."}
                </p>
              </div>
            </div>
            <form
              onSubmit={salvarDados}
              className="mt-5 grid gap-4 sm:grid-cols-2"
            >
              <Campo label="Nome Completo">
                <input
                  value={dados.nome}
                  onChange={atualizarDados("nome")}
                  className={INPUT}
                />
              </Campo>
              <Campo label="E-mail Corporativo">
                <input
                  type="email"
                  value={dados.email}
                  onChange={atualizarDados("email")}
                  className={INPUT}
                />
              </Campo>
              <Campo label="Telefone">
                <input
                  type="tel"
                  value={dados.telefone}
                  onChange={atualizarDados("telefone")}
                  placeholder="(11) 91234-5678"
                  className={INPUT}
                />
              </Campo>
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-slate-800">
                  Cargo / Função
                </span>
                <input
                  value={cargoLabel}
                  readOnly
                  disabled
                  title="O cargo é definido pelo gerente no cadastro e não pode ser alterado por aqui."
                  className={`${INPUT} cursor-not-allowed bg-slate-50 text-slate-500`}
                />
                <span className="text-[10px] text-slate-400">
                  Definido pelo gerente no cadastro.
                </span>
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={salvandoDados}
                  className="rounded-lg bg-[#ff5a47] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {salvandoDados ? "Salvando..." : "Salvar dados"}
                </button>
                <button
                  type="button"
                  onClick={cancelar}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-900">
              Segurança e Senha
            </h2>
            <form onSubmit={salvarSenha} className="mt-4 flex flex-col gap-4">
              <CampoSenha
                label="Senha Atual"
                value={senha.atual}
                onChange={atualizarSenha("atual")}
                autoComplete="current-password"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoSenha
                  label="Nova Senha"
                  placeholder="Min. 8 caracteres"
                  value={senha.nova}
                  onChange={atualizarSenha("nova")}
                  autoComplete="new-password"
                />
                <CampoSenha
                  label="Confirmar Nova Senha"
                  placeholder="Digite novamente"
                  value={senha.confirmar}
                  onChange={atualizarSenha("confirmar")}
                  autoComplete="new-password"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Use ao menos 8 caracteres, com letra maiúscula, minúscula e
                caractere especial.
              </p>
              <div>
                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="rounded-lg bg-[#ff5a47] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {salvandoSenha ? "Atualizando..." : "Atualizar senha"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-900">
              Preferências de Notificação
            </h2>
            <ul className="mt-4 divide-y divide-slate-200">
              {NOTIFICACOES.map((n) => (
                <li
                  key={n.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-[12px] font-semibold text-slate-800">
                      {n.titulo}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {n.descricao}
                    </p>
                  </div>
                  <Toggle
                    ligado={notificacoes[n.id]}
                    onChange={() => alternar(n.id)}
                    label={n.titulo}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-900">
              Sessões Ativas
            </h2>
            <ul className="mt-4 flex flex-col gap-3.5">
              {sessoes.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="flex items-center gap-2 text-[12px] font-semibold text-slate-800">
                      {s.dispositivo}
                      {s.atual && (
                        <span className="rounded bg-green-100 px-1.5 py-px text-[9px] font-bold text-green-600">
                          ATUAL
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {s.detalhe ?? "Esta sessão"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {s.quando}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
