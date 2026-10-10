import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChefHat, UserPlus, Mail, KeyRound } from "lucide-react";

import olhinho from "../../../assets/loginImages/olhinho.png";
import olho_cerrado from "../../../assets/loginImages/olho_cerrado.png";
import Snackbar from "../../components/snackBar/SnackBar";

import api from "../../services/axios";

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#ff523b] focus:ring-2 focus:ring-[#ff523b]/20 placeholder:text-gray-300";

const BUTTON =
  "mt-2 w-full rounded-xl bg-[#ff523b] py-3 font-semibold text-white transition-colors hover:bg-[#e0442f] disabled:opacity-70 cursor-pointer";

const GHOST_BUTTON =
  "w-full py-2 text-sm font-semibold text-gray-500 transition hover:text-[#ff523b] cursor-pointer disabled:opacity-60";

function Campo({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-800">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function RecupSenha() {
  const navigate = useNavigate();

  const [etapa, setEtapa] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarNova, setMostrarNova] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  // Token opaco de uso único: vive só em memória (nunca em localStorage/URL).
  const [resetToken, setResetToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  const voltarParaLogin = (message) => {
    setSnackbar({ message, type: "success" });
    setResetToken(null);
    setTimeout(() => navigate("/"), 2000);
  };

  const handleRequest = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setSnackbar({ message: "Informe o seu e-mail.", type: "warning" });
      return;
    }

    try {
      setLoading(true);
      const response = await api.postPasswordResetRequest({ email });

      setSnackbar({
        message:
          response.data.message ||
          "Se o e-mail estiver cadastrado, um código foi enviado.",
        type: "success",
      });
      setOtp("");
      setEtapa("otp");
    } catch (error) {
      setSnackbar({
        message:
          error?.response?.data?.message || "Erro ao conectar com o Servidor",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setSnackbar({
        message: "Digite o código de 6 dígitos enviado ao seu e-mail.",
        type: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await api.postPasswordResetVerify({ email, otp });
      const data = response.data;

      if (data.flow === "first_login") {
        voltarParaLogin(
          data.message ||
            "Uma nova senha temporária foi enviada ao seu e-mail. Efetue login e altere a senha.",
        );
        return;
      }

      setResetToken(data.resetToken);
      setNovaSenha("");
      setConfirmarSenha("");
      setSnackbar({
        message: data.message || "Código verificado. Defina a nova senha.",
        type: "success",
      });
      setEtapa("novaSenha");
    } catch (error) {
      setSnackbar({
        message:
          error?.response?.data?.message || "Erro ao conectar com o Servidor",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();

    if (!novaSenha || !confirmarSenha) {
      setSnackbar({ message: "Preencha todos os campos.", type: "warning" });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setSnackbar({
        message: "A confirmação não coincide com a nova senha.",
        type: "warning",
      });
      return;
    }

    if (!resetToken) {
      setSnackbar({
        message: "Sessão de recuperação expirada. Solicite um novo código.",
        type: "error",
      });
      setEtapa("email");
      return;
    }

    try {
      setLoading(true);
      const response = await api.postPasswordResetConfirm({
        reset_token: resetToken,
        new_password: novaSenha,
        confirm_password: confirmarSenha,
      });

      voltarParaLogin(
        response.data.message ||
          "Senha redefinida com sucesso. Efetue login com a nova senha.",
      );
    } catch (error) {
      const status = error?.response?.status;

      // Token inválido/expirado/consumido: descarta e recomeça do e-mail.
      if (status === 400 || status === 404) {
        setResetToken(null);
      }

      setSnackbar({
        message:
          error?.response?.data?.message || "Erro ao conectar com o Servidor",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh w-full bg-gray-100 flex flex-col items-center justify-center px-4 py-6 sm:px-6">
      {snackbar && (
        <Snackbar
          isOpen={true}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}

      <div className="mb-5 flex items-center gap-2 rounded-full bg-[#ff523b] px-8 py-3 text-lg font-bold text-white shadow-sm sm:text-xl">
        <ChefHat className="h-6 w-6" />
        <span>Foodstuff KDS</span>
      </div>

      <div className="w-full max-w-md rounded-3xl bg-white p-5 text-center shadow-xl sm:p-8">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
          <UserPlus className="h-6 w-6 text-[#ff523b]" />
        </div>

        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          Recuperar senha
        </h1>

        <p className="mb-6 text-xs leading-relaxed text-gray-400">
          Recupere sua senha
        </p>

        {etapa === "email" && (
          <form onSubmit={handleRequest} className="space-y-4 text-left">
            <Campo label="E-mail para recuperar a senha">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type="email"
                  placeholder="adm@foodstuff.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                />
              </div>
            </Campo>

            <button type="submit" disabled={loading} className={BUTTON}>
              {loading ? "Enviando..." : "Enviar código"}
            </button>

            <div className="pt-2 text-center">
              <span className="text-sm">
                Lembrou a senha?
                <Link
                  to="/"
                  className="text-sm font-bold text-[#ff523b] hover:underline ml-1"
                >
                  Login
                </Link>
              </span>
            </div>
          </form>
        )}

        {etapa === "otp" && (
          <form onSubmit={handleVerify} className="space-y-4 text-left">
            <Campo label="Digite o código">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="00.00.00"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className={INPUT}
                />
              </div>
            </Campo>

            <p className="text-[11px] text-gray-400">
              Enviamos um código de 6 dígitos para {email}. Ele é válido por 5
              minutos.
            </p>

            <button type="submit" disabled={loading} className={BUTTON}>
              {loading ? "Conferindo..." : "Conferir código"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleRequest}
              className={GHOST_BUTTON}
            >
              Não recebeu? Reenviar código
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => setEtapa("email")}
              className={GHOST_BUTTON}
            >
              Usar outro e-mail
            </button>
          </form>
        )}

        {etapa === "novaSenha" && (
          <form onSubmit={handleConfirm} className="space-y-4 text-left">
            <Campo label="Digite a nova senha">
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type={mostrarNova ? "text" : "password"}
                  placeholder="Digite sua nova senha"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  autoComplete="new-password"
                  className={`${INPUT} pr-12`}
                />

                <button
                  type="button"
                  onClick={() => setMostrarNova(!mostrarNova)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <img
                    src={mostrarNova ? olhinho : olho_cerrado}
                    alt={mostrarNova ? "Ocultar senha" : "Mostrar senha"}
                    className="h-5 w-5"
                  />
                </button>
              </div>
            </Campo>

            <Campo label="Confirme a senha">
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type={mostrarConfirmar ? "text" : "password"}
                  placeholder="Confirme sua nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  autoComplete="new-password"
                  className={`${INPUT} pr-12`}
                />

                <button
                  type="button"
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <img
                    src={mostrarConfirmar ? olhinho : olho_cerrado}
                    alt={mostrarConfirmar ? "Ocultar senha" : "Mostrar senha"}
                    className="h-5 w-5"
                  />
                </button>
              </div>
            </Campo>

            <p className="text-[11px] text-gray-400">
              Use ao menos 8 caracteres, com letra maiúscula, minúscula e
              caractere especial.
            </p>

            <button type="submit" disabled={loading} className={BUTTON}>
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
