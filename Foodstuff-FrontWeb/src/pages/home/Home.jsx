import Header from "../../components/header/Header";

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-82px)] w-full bg-[#f8fafc] px-5 py-6 lg:px-8">
        <Header/>
      <div className="w-full">

        {/* CARDS SUPERIORES */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="h-[112px] rounded-2xl border border-gray-200 bg-white shadow-sm" />
          <div className="h-[112px] rounded-2xl border border-gray-200 bg-white shadow-sm" />
          <div className="h-[112px] rounded-2xl border border-gray-200 bg-white shadow-sm" />
          <div className="h-[112px] rounded-2xl border border-gray-200 bg-white shadow-sm" />
        </div>

        {/* ÁREA DOS GRÁFICOS */}
        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-12">
          
          <div className="h-[285px] rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-5" />

          <div className="h-[285px] rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-4" />

          <div className="h-[285px] rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-3" />

        </div>

        {/* TABELA / PEDIDOS */}
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          
          {/* Cabeçalho da tabela */}
          <div className="mb-5 h-7 w-40 rounded-md bg-gray-100" />

          {/* Área da tabela */}
          <div className="overflow-hidden rounded-xl border border-gray-200">
            
            <div className="h-11 border-b border-gray-200 bg-gray-50" />

            <div className="h-14 border-b border-gray-200 bg-white" />
            <div className="h-14 border-b border-gray-200 bg-white" />
            <div className="h-14 border-b border-gray-200 bg-white" />
            <div className="h-14 bg-white" />

          </div>
        </div>

      </div>
    </main>
  );
}