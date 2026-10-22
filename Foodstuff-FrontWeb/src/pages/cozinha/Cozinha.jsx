      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          {/* Marca / Boas-vindas */}
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF5F38]/10">
              <ChefHat size={20} className="text-[#FF5F38]" />
            </span>

            <div className="min-w-0">
              <p className="truncate text-[15px] font-extrabold leading-tight tracking-tight text-slate-900">
                Bem-vindo, {primeiroNome}
              </p>

              <p className="truncate text-[11.5px] font-medium text-slate-400">
                Foodstuff • Tela da Cozinha
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {/* Data */}
            <div className="hidden text-right md:block">
              <p className="text-[12.5px] font-semibold capitalize text-slate-700">
                {data}
              </p>

              <p className="text-[10.5px] font-medium text-slate-400">
                Turno atual
              </p>
            </div>

            <span className="hidden h-8 w-px bg-slate-200 md:block" />

            {/* Relógio */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
              <Clock3 size={14} className="text-slate-400" />

              <span className="text-[13.5px] font-extrabold tabular-nums text-slate-800">
                {hora}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
        <KitchenKanban
          initialOrders={orders}
          onStatusChange={handleStatusChange}
          loading={loading}
        />
      </main>