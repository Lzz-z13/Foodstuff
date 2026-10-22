export default function Header() {
  const user = JSON.parse(localStorage.getItem("user") ?? "null") ?? {};

  return (
    <header className="flex h-20 w-full items-center justify-between gap-3 px-4 md:px-10">
      <div className="min-w-0">
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
