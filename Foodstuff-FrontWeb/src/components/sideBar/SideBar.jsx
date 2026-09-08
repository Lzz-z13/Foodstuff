import { Link } from "react-router-dom";
import {
  House,
  HandPlatter,
  ScrollText,
  UsersRound,
  Table2,
  Settings,
  UserRoundPlus,
  ForkKnife
} from "lucide-react";

export default function SideBar() {
  return (
    <aside
      className="
        fixed
        inset-y-0
        left-0
        z-10
        hidden
        w-[230px]
        border-r-[3px]
        border-gray-50
        bg-white
        md:flex
        md:flex-col
      "
    >
      {/* LOGO */}
      <div className="flex h-14 items-center gap-3 px-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#ff5a47] text-xs font-bold text-white">
          <ForkKnife/>
        </span>

        <strong className="text-base text-gray-800">Foodstuff</strong>

        <span className="rounded border border-gray-200 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
          ADMIN
        </span>
      </div>

      {/* MENU */}
      <nav className="mt-4 flex flex-1 flex-col gap-1.5 px-3">
        {/* DASHBOARD */}
        <Link
          to="#"
          className="
            flex
            items-center
            gap-3
            rounded-lg
            px-3
            py-2.5
            text-sm
            text-gray-600
            transition
            hover:bg-gray-50
          "
        >
          <House size={17} />
          <span>Dashboard</span>
        </Link>

        {/* PEDIDOS */}
        <Link
          to="#"
          className="
            flex
            items-center
            gap-3
            rounded-lg
            px-3
            py-2.5
            text-sm
            text-gray-600
            transition
            hover:bg-gray-50
          "
        >
          <ScrollText size={17} />
          <span>Pedidos</span>
        </Link>

        {/* CARDÁPIO */}
        <Link
          to="#"
          className="
            flex
            items-center
            gap-3
            rounded-lg
            px-3
            py-2.5
            text-sm
            text-gray-600
            transition
            hover:bg-gray-50
          "
        >
          <HandPlatter size={17} />
          <span>Cardápio</span>
        </Link>

        {/* MESAS */}
        <Link
          to="#"
          className="
            flex
            items-center
            gap-3
            rounded-lg
            px-3
            py-2.5
            text-sm
            text-gray-600
            transition
            hover:bg-gray-50
          "
        >
          <Table2 size={17} />
          <span>Mesas</span>
        </Link>

        {/* EQUIPE */}
        <Link
          to="#"
          className="
            flex
            items-center
            gap-3
            rounded-lg
            px-3
            py-2.5
            text-sm
            text-gray-600
            transition
            hover:bg-gray-50
          "
        >
          <UsersRound size={17} />
          <span>Equipe</span>
        </Link>

        {/* CONFIGURAÇÕES */}
        <Link
          to="#"
          className="
            flex
            items-center
            gap-3
            rounded-lg
            px-3
            py-2.5
            text-sm
            text-gray-600
            transition
            hover:bg-gray-50
          "
        >
          <Settings size={17} />
          <span>Configurações</span>
        </Link>

        {/* CADASTRAR FUNCIONÁRIO */}
        <Link
          to="/cadastro"
          className="
          flex
            mt-2
            rounded-lg
            px-3
            py-2.5
            text-gray-600
            text-sm
            transition
          "
        >
          <UserRoundPlus size={17} className="mr-2"/>
          Cadastrar funcionário
        </Link>
      </nav>

      {/* USUÁRIO */}
      <div className="mx-4 border-t border-gray-100 py-4">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 shrink-0 rounded-full bg-gray-300" />

          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-gray-800">
              Luiz Felipe
            </p>

            <p className="truncate text-[10px] text-gray-400">
              luizfelipe@foodstuff.adm.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
