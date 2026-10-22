import { Outlet } from "react-router-dom";

import KitchenSidebar from "./KitchenSidebar";

export default function KitchenLayout() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <KitchenSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
