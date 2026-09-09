import { useState } from "react";
import {
  Bell,
  CircleHelp,
  CircleUserRound,
  UserRoundPlus,
  UserRound,
  Mail,
  Phone,
} from "lucide-react";

import "./Cadastro.css";
import SideBar from "../../components/sideBar/SideBar";
import api from "../../axios/axios";
import Snackbar from "../../components/snackBar/SnackBar";

const cargos = ["WAITER", "KITCHEN", "CASHIER", "MANAGER"];

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
        cargo: "Garçom",
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

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <>
      <SideBar userName={user.name} userEmail={user.email}/>
      
      <div className="md:ml-[163px]">
        {snackbar && (
          <Snackbar
            isOpen={true}
            message={snackbar.message}
            type={snackbar.type}
            onClose={() => setSnackbar(null)}
          />
        )}
        <div className="cadastro-layout">
          <main className="cadastro-main">
            <div className="top-actions">
              <Bell />
              <CircleHelp />
              <CircleUserRound className="profile-dot" />
            </div>

            <section className="cadastro-card">
              <header className="cadastro-heading">
                <div className="heading-icon">
                  <UserRoundPlus />
                </div>

                <h1>Cadastre um funcionário</h1>

                <p>Cadastre novos funcionários para te ajudar</p>
              </header>

              <form onSubmit={handleSubmit}>
                <Campo label="Nome completo" icon={<UserRound />}>
                  <input
                    required
                    value={form.nome}
                    onChange={(e) => alterar("nome", e.target.value)}
                    placeholder="Nome completo do funcionário"
                  />
                </Campo>

                <Campo label="E-mail" icon={<Mail />}>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => alterar("email", e.target.value)}
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
                    placeholder="(16) 00000-0000"
                  />
                </Campo>

                <div className="cargo">
                  <label>Cargo</label>

                  <div className="roles">
                    {cargos.map((c) => (
                      <button
                        type="button"
                        key={c}
                        className={form.cargo === c ? "selected" : ""}
                        onClick={() => alterar("cargo", c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="submit" type="submit" disabled={loading}>
                  {loading ? "Cadastrando..." : "Cadastrar funcionário"}
                </button>
              </form>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}

function Campo({ label, icon, children }) {
  return (
    <div className="field">
      <label>{label}</label>

      <div className="input-wrap">
        <span>{icon}</span>
        {children}
      </div>
    </div>
  );
}
