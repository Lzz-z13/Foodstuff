import "./style.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Pg404 from "./pages/404/pg404";
import Login from "./pages/login/Login";
import RecupSenha from "./pages/recupSenha/RecupSenha";
import CadastroFuncionario from "./pages/cadastro/CadastroFuncionario";
import Home from "./pages/home/Home";
import Mesas from "./pages/mesas/Mesas";
import MinhaConta from "./pages/minhaConta/MinhaConta";
import Equipe from "./pages/equipe/Equipe";
import Pedidos from "./pages/pedidos/Pedidos";
import Cardapio from "./pages/cardapio/Cardapio";
import Cozinha from "./pages/cozinha/Cozinha";

import ProtectedRoute from "./components/protectedRoute/ProtectedRoute";
import RoleRoute from "./components/protectedRoute/RoleRoute";

import DefaultLayout from "./components/defaultLayout/DefaultLayout";
import KitchenLayout from "./components/kitchen/KitchenLayout";
import { getRole } from "./services/auth";

function AccountLayout() {
  return getRole() === "KITCHEN" ? <KitchenLayout /> : <DefaultLayout />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/recuperarSenha" element={<RecupSenha />} />

        {/* Protegidas - exige token */}
        <Route element={<ProtectedRoute />}>
          {/* COZINHA */}
          <Route element={<RoleRoute allowedRoles={["KITCHEN"]} />}>
            <Route element={<KitchenLayout />}>
              <Route path="/cozinha" element={<Cozinha />} />
            </Route>
          </Route>
          <Route element={<DefaultLayout />}>
            {/* Administração */}
            <Route element={<RoleRoute allowedRoles={["MANAGER"]} />}>
              <Route path="/home" element={<Home />} />
              <Route path="/mesas" element={<Mesas />} />
              <Route path="/equipe" element={<Equipe />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/cardapio" element={<Cardapio />} />
              <Route path="/cadastro" element={<CadastroFuncionario />} />
            </Route>

          </Route>

          {/* Uma única rota de conta, com a sidebar do cargo conectado. */}
          <Route element={<RoleRoute allowedRoles={["MANAGER", "KITCHEN", "CASHIER"]} />}>
            <Route element={<AccountLayout />}>
              <Route path="/minha-conta" element={<MinhaConta />} />
            </Route>
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Pg404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
