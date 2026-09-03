import "../../style.css";
import iconeLogin from "../../../assets/loginImages/login_image.png";
import iconeTalher from "../../../assets/loginImages/talher_image.png";
import cadeado from "../../../assets/loginImages/cadeado.png";
import email from "../../../assets/loginImages/email.png";
import olhinho from "../../../assets/loginImages/olhinho.png";
import olho_cerrado from "../../../assets/loginImages/olho_cerrado.png";

export default function Login() {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-dvh bg-gray-100 flex flex-col items-center justify-center p-3">
      <div className="mb-5 flex items-center gap-2 bg-[#ff523b] text-white px-6 py-2.5 rounded-2xl font-bold text-xl shadow-sm">
        <img className="w-6 h-6 invert" fill="none" src={iconeTalher}></img>
        <span>Foodstuff</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-sm text-center">
        <div className="w-12 h-12 mx-auto mb-3 Monarch bg-red-50 rounded-2xl flex items-center justify-center text-[#ff523b]">
          <img
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            src={iconeLogin}
          ></img>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Login</h1>
        <p className="text-xs text-gray-400 mb-6">
          Entre com suas credenciais para gerenciar a plataforma
        </p>

        <form className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              E-mail
            </label>
            <div className="relative">
              <img
                className="w-4 h-4 absolute left-3.5 top-1/3"
                fill="none"
                stroke=""
                stroke-width="2"
                viewBox="0 0 24 24"
                src={email}
              ></img>
              <input
                type="email"
                placeholder="seunome@empresa.com.br"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff523b]/20 focus:border-[#ff523b] placeholder:text-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Senha
            </label>
            <div className="relative">
              <img
                className="w-4 h-4 absolute left-3 top-1/3"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
                src={cadeado}
              ></img>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff523b]/20 focus:border-[#ff523b] placeholder:text-gray-300"
              />
              <img
                className="w-4 h-4 absolute left-88 top-[13px] "
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
                src={olho_cerrado}
              ></img>
            </div>
            <span className="block text-[11px] text-gray-400 mt-1">
              Sua senha deve conter pelo menos 8 caracteres.
            </span>
          </div>

          <button
            type="submit"
            className="w-full bg-[#ff523b] hover:bg-[#e0442f] text-white font-semibold py-3 rounded-xl transition-colors mt-2"
          >
            Entrar
          </button>

          <div className="text-center pt-2">
            <a
              href="#"
              className="text-sm font-semibold text-[#ff523b] hover:underline"
            >
              Esqueceu a senha?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
