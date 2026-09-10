import { Outlet } from "react-router-dom";

import Header from "../components/header/Header";
import SideBar from "../components/sideBar/SideBar";

export default function DefaultLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <SideBar />

      {/* Área principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <Header />

        {/* Conteúdo */}
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
