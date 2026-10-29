import "./style.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Pg404 from "./pages/404/pg404";
import Login from "./pages/login/Login";
import RecupSenha from "./pages/recupSenha/RecupSenha";
import MinhaConta from "./pages/minhaConta/MinhaConta";
import Home from "./pages/AdmPages/home/Home";
import CadastroFuncionario from "./pages/AdmPages/cadastro/CadastroFuncionario";
import Mesas from "./pages/AdmPages/mesas/Mesas";
import Equipe from "./pages/AdmPages/equipe/Equipe";
import Pedidos from "./pages/AdmPages/pedidos/Pedidos";
import Cardapio from "./pages/AdmPages/cardapio/Cardapio";
import Cozinha from "./pages/CozinhaPages/cozinha/Cozinha";

import ProtectedRoute from "./components/protectedRoute/ProtectedRoute";
import RoleRoute from "./components/protectedRoute/RoleRoute";

import DefaultLayout from "./components/defaultLayout/DefaultLayout";
import KitchenLayout from "./components/kitchen/KitchenLayout";
import CashierLayout from "./components/cashier/CashierLayout";
import Caixa from "./pages/CaixaPages/Caixa";
import Pagamento from "./pages/CaixaPages/Pagamento";
import { getRole } from "./services/auth";

function AccountLayout() {
  if (getRole() === "CASHIER") return <CashierLayout />;
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
          <Route element={<RoleRoute allowedRoles={["CASHIER", "MANAGER"]} />}>
            <Route element={<CashierLayout />}>
              <Route path="/caixa" element={<Caixa />} />
              <Route path="/caixa/comandas/:commandId/pagamento" element={<Pagamento />} />
            </Route>
          </Route>
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
