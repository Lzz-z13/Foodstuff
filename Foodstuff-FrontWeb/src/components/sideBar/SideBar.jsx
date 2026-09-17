import { Link } from "react-router-dom";
import {
  House,
  ScrollText,
  HandPlatter,
  Table2,
  UsersRound,
  Settings,
  UserRoundPlus,
  ForkKnife,
  LogOut,
} from "lucide-react";
import { useState } from "react";

export default function SideBar() {
  const [menuAberto, setMenuAberto] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <aside
      className="
        fixed
        inset-y-0
        left-0
        z-50
        hidden
        w-[163px]
        min-w-[163px]
        bg-white
        border-r
        border-gray-200
        md:flex
        md:flex-col
      "
    >
      {/* LOGO */}
      <div className="flex h-14 items-center gap-2 px-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#ff5a47] text-white">
          <ForkKnife size={15} />
        </span>

        <strong className="whitespace-nowrap text-[14px] font-semibold text-gray-800">
          Foodstuff
        </strong>

        <span className="shrink-0 rounded border border-gray-200 px-1 py-[2px] text-[7px] font-semibold text-gray-500">
          ADMIN
        </span>
      </div>

      {/* MENU */}
      <nav className="mt-5 flex flex-1 flex-col gap-1 px-2">
        <Link
          to="/home"
          className="
            flex items-center gap-2
            rounded-lg
            px-2.5 py-2.5
            text-[13px]
            text-gray-600
            whitespace-nowrap
            transition
            hover:bg-[#ff5a47]
            hover:text-white
          "
        >
          <House size={16} />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/pedidos"
          className="
            flex items-center gap-2
            rounded-lg
            px-2.5 py-2.5
            text-[13px]
            text-gray-600
            whitespace-nowrap
            transition
            hover:bg-[#ff5a47]
            hover:text-white
          "
        >
          <ScrollText size={16} />
          <span>Pedidos</span>
        </Link>

        <Link
          to="/cardapio"
          className="
            flex items-center gap-2
            rounded-lg
            px-2.5 py-2.5
            text-[13px]
            text-gray-600
            whitespace-nowrap
            transition
            hover:bg-[#ff5a47]
            hover:text-white
          "
        >
          <HandPlatter size={16} />
          <span>Cardápio</span>
        </Link>

        <Link
          to="/mesas"
          className="
            flex items-center gap-2
            rounded-lg
            px-2.5 py-2.5
            text-[13px]
            text-gray-600
            whitespace-nowrap
            transition
            hover:bg-[#ff5a47]
            hover:text-white
          "
        >
          <Table2 size={16} />
          <span>Mesas</span>
        </Link>

        <Link
          to="/equipe"
          className="
            flex items-center gap-2
            rounded-lg
            px-2.5 py-2.5
            text-[13px]
            text-gray-600
            whitespace-nowrap
            transition
            hover:bg-[#ff5a47]
            hover:text-white
          "
        >
          <UsersRound size={16} />
          <span>Equipe</span>
        </Link>

        <Link
          to="/configs"
          className="
            flex items-center gap-2
            rounded-lg
            px-2.5 py-2.5
            text-[13px]
            text-gray-600
            whitespace-nowrap
            transition
            hover:bg-[#ff5a47]
            hover:text-white
          "
        >
          <Settings size={16} />
          <span>Configurações</span>
        </Link>

        <Link
          to="/cadastro"
          className="
            mt-2
            flex items-center gap-2
            rounded-lg
            px-2.5 py-2.5
            text-[13px]
            text-gray-600
            transition
            hover:bg-[#ff5a47]
            hover:text-white
          "
        >
          <UserRoundPlus size={16} />
          <span>Cadastrar Usuário</span>
        </Link>
      </nav>

      {/* USUÁRIO */}
      <div className="relative border-t border-gray-100 px-3 py-4">
        <button
          type="button"
          onClick={() => setMenuAberto(!menuAberto)}
          className="flex w-full items-center gap-2 rounded-lg p-1 text-left hover:bg-gray-200 cursor-pointer"
        >
          <span className="h-8 w-8 shrink-0 rounded-full bg-gray-300" />

          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-gray-800">
              {user.name}
            </p>

            <p className="truncate text-[8px] text-gray-400">{user.email}</p>
          </div>
        </button>

        {menuAberto && (
          <div className="absolute bottom-[75px] left-2 right-2 z-50 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
            <button
              type="button"
              className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-red-500 hover:bg-red-100 cursor-pointer"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/";
              }}
            >
              <LogOut size={16}/>
              <span className="ml-2">Sair</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
