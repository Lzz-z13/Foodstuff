import Header from "../../components/header/Header";
import SideBar from "../../components/sideBar/SideBar";

export default function Home() {
  return (
    <>
      <SideBar />
      <main className="min-h-screen bg-[#f8fafc]">
        {/* Conteúdo */}
        <div className="min-w-0 md:ml-[163px]">
          <Header />

          <div className="px-4 py-6 sm:px-5 lg:px-8">
            {/* CARDS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="h-[112px] rounded-2xl border border-gray-200 bg-white shadow-sm" />
              <div className="h-[112px] rounded-2xl border border-gray-200 bg-white shadow-sm" />
              <div className="h-[112px] rounded-2xl border border-gray-200 bg-white shadow-sm" />
              <div className="h-[112px] rounded-2xl border border-gray-200 bg-white shadow-sm" />
            </div>

            {/* GRÁFICOS */}
            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="h-[285px] rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-5" />

              <div className="h-[285px] rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-4" />

              <div className="h-[285px] rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-3" />
            </div>

            {/* TABELA */}
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-5 h-7 w-40 rounded-md bg-gray-100" />

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="h-11 border-b border-gray-200 bg-gray-50" />

                <div className="h-14 border-b border-gray-200 bg-white" />
                <div className="h-14 border-b border-gray-200 bg-white" />
                <div className="h-14 border-b border-gray-200 bg-white" />
                <div className="h-14 bg-white" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
