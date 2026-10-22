import { useState } from "react";
import {
  CircleUserRound,
  UserRoundPlus,
  UserRound,
  Mail,
  Phone,
} from "lucide-react";

import api from "../../services/axios";
import Snackbar from "../../components/snackBar/SnackBar";

const cargos = [
  { valor: "WAITER", label: "Garçom" },
  { valor: "KITCHEN", label: "Cozinha" },
  { valor: "CASHIER", label: "Caixa" },
  { valor: "MANAGER", label: "Gerente" },
];

export default function CadastroFuncionario() {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    cargo: "WAITER",
  });

  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState(null);

  const alterar = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const formatarTelefone = (v) => {
    const n = v.replace(/\D/g, "").slice(0, 11);

    if (n.length <= 2) return n ? `(${n}` : "";

    if (n.length <= 7) {
      return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    }

    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nome || !form.email || !form.telefone || !form.cargo) {
      setSnackbar({
        message: "Preencha todos os campos.",
        type: "warning",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await api.postUser({
        name: form.nome,
        email: form.email,
        phone: form.telefone,
        role: form.cargo,
      });

      setSnackbar({
        message: response.data.message || "Funcionário cadastrado com sucesso!",
        type: "success",
      });

      setForm({
        nome: "",
        email: "",
        telefone: "",
        cargo: "WAITER",
      });
    } catch (error) {
      setSnackbar({
        message:
          error?.response?.data?.message || "Erro ao conectar ao servidor",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-w-0">
        {snackbar && (
          <Snackbar
            isOpen={true}
            message={snackbar.message}
            type={snackbar.type}
            onClose={() => setSnackbar(null)}
          />
        )}
        <div className="relative flex min-h-screen overflow-hidden font-sans text-[#252930]">
          <main className="relative flex min-w-0 flex-1 items-center justify-center px-3 py-8 sm:px-6 sm:py-12">

            <section className="relative z-[1] flex w-full max-w-[520px] flex-col gap-7 overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-b from-white/[0.94] to-[#fff6f3]/[0.96] px-[18px] pb-[22px] pt-[38px] shadow-[0_28px_70px_rgba(35,37,43,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] sm:rounded-[28px] sm:px-[34px] sm:pb-9 sm:pt-[54px]">
              <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#ff5742] to-[#ff7a57]" />
              <header className="m-0 text-center">
                <div className="mx-auto mb-3.5 grid h-[52px] w-[52px] place-items-center rounded-[18px] bg-gradient-to-br from-[#ff5a43] to-[#ff8669] text-white shadow-[0_16px_34px_rgba(255,90,67,0.32)]">
                  <UserRoundPlus className="h-[23px] w-[23px]" strokeWidth={1.8} />
                </div>

                <span className="mb-2 inline-flex rounded-full border border-[#ff5a432e] bg-[#ff5a4314] px-3 py-[5px] text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#d8503a]">Novo acesso</span>

                <h1 className="mb-[7px] text-[clamp(24px,4vw,32px)] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#20242a]">Cadastre um funcionário</h1>

                <p className="text-[13px] font-medium leading-relaxed text-[#828b96]">Cadastre novos funcionários para te ajudar</p>
              </header>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Campo label="Nome completo" icon={<UserRound />}>
                  <input
                    required
                    value={form.nome}
                    onChange={(e) => alterar("nome", e.target.value)}
                    className="h-full w-full rounded-[15px] bg-transparent py-0 pl-11 pr-3.5 text-[13px] font-semibold text-[#303640] outline-none placeholder:font-medium placeholder:text-[#aeb5be]"
                    placeholder="Nome completo do funcionário"
                  />
                </Campo>

                <Campo label="E-mail" icon={<Mail />}>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => alterar("email", e.target.value)}
                    className="h-full w-full rounded-[15px] bg-transparent py-0 pl-11 pr-3.5 text-[13px] font-semibold text-[#303640] outline-none placeholder:font-medium placeholder:text-[#aeb5be]"
                    placeholder="Digite o e-mail do funcionário"
                  />
                </Campo>

                <Campo label="Telefone" icon={<Phone />}>
                  <input
                    required
                    value={form.telefone}
                    onChange={(e) =>
                      alterar("telefone", formatarTelefone(e.target.value))
                    }
                    className="h-full w-full rounded-[15px] bg-transparent py-0 pl-11 pr-3.5 text-[13px] font-semibold text-[#303640] outline-none placeholder:font-medium placeholder:text-[#aeb5be]"
                    placeholder="(16) 00000-0000"
                  />
                </Campo>

                <div>
                  <label className="mb-[7px] block text-xs font-bold text-[#202630]">Cargo</label>

                  <p className="mb-[11px] mt-[-3px] text-[11px] leading-[1.35] text-[#9099a4]">
                    Selecione a função que esse funcionário terá no sistema.
                  </p>

                  <div className="grid grid-cols-1 gap-2.5 min-[521px]:grid-cols-2">
                    {cargos.map((cargo) => (
                      <button
                        type="button"
                        key={cargo.valor}
                        aria-pressed={form.cargo === cargo.valor}
                        className={`min-h-[42px] w-full cursor-pointer rounded-[14px] border text-xs font-bold shadow-sm transition hover:-translate-y-px hover:border-[#ff5a438a] hover:bg-[#fff6f3] ${form.cargo === cargo.valor ? "border-[#ff5a43] bg-gradient-to-br from-[#24232a] to-[#3a3740] text-white shadow-lg" : "border-[#ff5a433d] bg-white/80 text-[#37404a]"}`}
                        onClick={() => alterar("cargo", cargo.valor)}
                      >
                        {cargo.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="mt-1.5 h-12 w-full cursor-pointer rounded-2xl bg-gradient-to-br from-[#ff5742] to-[#ff7a57] text-[13px] font-extrabold text-white shadow-[0_18px_34px_rgba(255,90,67,0.28)] transition hover:-translate-y-px hover:saturate-110 hover:shadow-[0_22px_40px_rgba(255,90,67,0.34)] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none" type="submit" disabled={loading}>
                  {loading ? "Cadastrando..." : "Cadastrar funcionário"}
                </button>
              </form>
            </section>
          </main>
        </div>
      </div>
  );
}

function Campo({ label, icon, children }) {
  return (
    <div className="flex flex-col">
      <label className="mb-[7px] block text-xs font-bold text-[#202630]">{label}</label>

      <div className="relative flex h-12 w-full items-center rounded-[15px] border border-[#d8dee6f2] bg-white/85 shadow-[0_10px_26px_rgba(31,41,55,0.045)] transition focus-within:-translate-y-px focus-within:border-[#ff6a59] focus-within:shadow-[0_0_0_4px_rgba(255,106,89,0.12),0_16px_34px_rgba(255,90,67,0.12)]">
        <span className="absolute left-3.5 grid place-items-center text-[#ff5a43] [&>svg]:h-[17px] [&>svg]:w-[17px]">{icon}</span>
        {children}
      </div>
    </div>
  );
}
