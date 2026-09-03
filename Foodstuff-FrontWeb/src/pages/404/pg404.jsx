import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import iconeTalher from "../../../assets/loginImages/talher_image.png";

export default function Pg404() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh from-orange-500 bg-white to-red-50 flex flex-col items-center justify-center p-6">
      <div className="mb-6 flex items-center gap-3 bg-[#ff523b] text-white px-6 py-3 rounded-2xl font-bold text-2xl shadow-md">
        <img className="w-7 h-7 invert" src={iconeTalher} alt="Foodstuff" />
        <span>Foodstuff</span>
      </div>

      <div className="w-full max-w-md rounded-3xl bg-white p-13 shadow-xl border border-orange-300 text-center">
        <div className="text-7xl font-black text-[#ff523b] leading-none">
          404
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-800">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm text-gray-600 mb-6">
          A página que você tentou acessar não existe.
        </p>

        <Link to="/" className="w-2xs bg-[#ff523b] rounded-2xl py-3 px-6 font-semibold transition-colors text-white">
          Voltar para Login
        </Link>
      </div>
    </div>
  );
};