import { Link } from "react-router-dom";

import iconeLogin from "../../../assets/loginImages/login_image.png";
import iconeTalher from "../../../assets/loginImages/talher_image.png";
import email from "../../../assets/loginImages/email.png";

export default function RecupSenha() {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <main className="min-h-dvh w-full bg-gray-100 flex flex-col items-center justify-center px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-2 rounded-2xl bg-[#ff523b] px-5 py-2.5 text-lg font-bold text-white shadow-sm sm:px-6 sm:text-xl">
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

        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          Recuperar senha
        </h1>

        <p className="mb-6 text-xs leading-relaxed text-gray-400">
          Recupere sua senha
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              E-mail
            </label>

            <div className="relative">
              <img
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                src={email}
                alt=""
              />

              <input
                type="email"
                placeholder="seunome@empresa.com.br"
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
              />
            </div>
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
            Enviar código
          </button>

          <div className="pt-2 text-center">
            <span>
              Lembrou da senha??
              <Link
                to="/"
                className="text-sm font-bold text-[#ff523b] hover:underline ml-1"
              >
                Login
              </Link>
            </span>
          </div>
        </form>
      </div>
    </main>
  );
}
