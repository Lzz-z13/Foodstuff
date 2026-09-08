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
} from "lucide-react";

export default function SideBar() {
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
      <div className="border-t border-gray-100 px-3 py-4">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 shrink-0 rounded-full bg-gray-300" />

          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-gray-800">
              Luiz Felipe
            </p>

            <p className="truncate text-[8px] text-gray-400">
              luizfelipe@foodstuff.adm...
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}