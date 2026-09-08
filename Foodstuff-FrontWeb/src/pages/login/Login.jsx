import { useState } from "react";

import "../../style.css";
import Snackbar from "../../components/snackBar/SnackBar";

import iconeLogin from "../../../assets/loginImages/login_image.png";
import iconeTalher from "../../../assets/loginImages/talher_image.png";
import cadeado from "../../../assets/loginImages/cadeado.png";
import email_img from "../../../assets/loginImages/email.png";
import olhinho from "../../../assets/loginImages/olhinho.png";
import olho_cerrado from "../../../assets/loginImages/olho_cerrado.png";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [snackbar, setSnackbar] = useState(null);

  const handleSubmit = (e) => { 
    e.preventDefault();
  };

  return (
    <main className="min-h-dvh w-full bg-gray-100 flex flex-col items-center justify-center px-4 py-6 sm:px-6">
      {snackbar && (
        <Snackbar
          isOpen={snackbar.message !== ""}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar({ message: "", type: "" })}
        />
      )}
      <div className="mb-5 flex items-center gap-2 rounded-2xl bg-[#ff523b] py-3 text-lg font-bold text-white shadow-sm sm:px-10 sm:text-xl">
        <img
          className="h-5 w-5 invert sm:h-6 sm:w-6"
          src={iconeTalher}
          alt="Foodstuff"
        />

        <span>Foodstuff</span>
      </div>

      <div className="w-full max-w-md rounded-3xl bg-white p-5 text-center shadow-xl sm:p-8">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
          <img className="h-6 w-6" src={iconeLogin} alt="Login" />
        </div>

        <h1 className="mb-1 text-2xl font-bold text-gray-900">Login</h1>

        <p className="mb-6 text-xs leading-relaxed text-gray-400">
          Cadastre novos funcionários para te ajudar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              E-mail
            </label>

            <div className="relative">
              <img
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                src={email_img}
                alt=""
              />

              <input
                type="text"
                placeholder="adm@foodstuff"
                className="
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  bg-gray-50/50
                  py-2.5
                  pl-10
                  pr-4
                  text-sm
                  outline-none
                  transition
                  focus:border-[#ff523b]
                  focus:ring-2
                  focus:ring-[#ff523b]/20
                  placeholder:text-gray-300
                "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Senha
            </label>

            <div className="relative">
              <img
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                src={cadeado}
                alt=""
              />

              <input
                type={mostrarSenha ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  bg-gray-50/50
                  py-2.5
                  pl-10
                  pr-12
                  text-sm
                  outline-none
                  transition
                  focus:border-[#ff523b]
                  focus:ring-2
                  focus:ring-[#ff523b]/20
                "
              />

              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  cursor-pointer
                "
              >
                <img
                  src={mostrarSenha ? olhinho : olho_cerrado}
                  alt={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="h-5 w-5"
                />
              </button>
            </div>

            <span className="mt-1 block text-[11px] leading-relaxed text-gray-400">
              Sua senha deve conter pelo menos 8 caracteres.
            </span>
          </div>

          <button
            type="submit"
            className="
              mt-2
              w-full
              rounded-xl
              bg-[#ff523b]
              py-3
              font-semibold
              text-white
              transition-colors
              hover:bg-[#e0442f]
              cursor-pointer
            "
          >
            Entrar
          </button>

          <div className="pt-2 text-center">
            <Link
              to="/recuperarSenha"
              className="text-sm font-semibold text-[#ff523b] hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
