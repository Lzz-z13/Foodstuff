import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CircleHelp,
  CircleUserRound,
  UserRoundPlus,
  UserRound,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  House,
  ShoppingCart,
  BookOpen,
  Square,
  UsersRound,
  Settings,
  Lightbulb,
} from "lucide-react";
import "./Cadastro.css";

const cargos = ["Garçom", "Cozinha", "Caixa", "Gerente"];

export default function CadastroFuncionario() {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    cargo: "Garçom",
    senha: "",
  });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const alterar = (campo, valor) => setForm({ ...form, [campo]: valor });
  const formatarTelefone = (v) => {
    const n = v.replace(/\D/g, "").slice(0, 11);
    if (n.length <= 2) return n ? `(${n}` : "";
    if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
    return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  };

  function cadastrar(e) {
    e.preventDefault();
    const lista = JSON.parse(
      localStorage.getItem("foodstuff_funcionarios") || "[]",
    );
    localStorage.setItem(
      "foodstuff_funcionarios",
      JSON.stringify([
        ...lista,
        { ...form, criadoEm: new Date().toISOString() },
      ]),
    );
    setMensagem("Funcionário cadastrado com sucesso!");
    setForm({ nome: "", email: "", telefone: "", cargo: "Garçom", senha: "" });
    setTimeout(() => setMensagem(""), 2500);
  }

  return (
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
          <form onSubmit={cadastrar}>
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
            <button className="submit">Cadastrar funcionário</button>
          </form>
        </section>
      </main>
    </div>
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
