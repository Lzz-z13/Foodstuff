import { lerUsuario } from "../../services/auth";

export default function Header() {
  const user = lerUsuario() ?? {};

  return (
    <header className="flex h-20 w-full items-center justify-between gap-3 px-4 md:px-10">
      {/* Espaço para o botão do menu em telas menores */}
      <div className="min-w-0 pl-12 lg:pl-0">
        <h1 className="truncate text-[22px] font-bold text-slate-900">
          Bem-vindo, {user.name ?? "Usuário"}
        </h1>

        <p className="mt-1 hidden text-sm text-slate-500 sm:block">
          Aqui está um resumo do desempenho do seu Foodstuff hoje.
        </p>
      </div>
    </header>
  );
}