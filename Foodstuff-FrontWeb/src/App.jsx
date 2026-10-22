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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/recuperarSenha" element={<RecupSenha />} />

        {/* Protegidas - exige token */}
        <Route element={<ProtectedRoute />}>
          {/* Cozinha (KITCHEN e MANAGER) - layout próprio */}
          <Route element={<RoleRoute allowedRoles={["KITCHEN", "MANAGER"]} />}>
            <Route element={<KitchenLayout />}>
              <Route path="/cozinha" element={<Cozinha />} />
            </Route>
          </Route>

          {/* Admin/Outros - layout padrão */}
          <Route element={<RoleRoute allowedRoles={["MANAGER", "WAITER", "CASHIER"]} />}>
            <Route element={<DefaultLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/mesas" element={<Mesas />} />
              <Route path="/equipe" element={<Equipe />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/cardapio" element={<Cardapio />} />
            </Route>
          </Route>

          {/* Minha Conta da cozinha compartilha a sidebar com o workflow. */}
          <Route element={<RoleRoute allowedRoles={["KITCHEN"]} />}>
            <Route element={<KitchenLayout />}>
              <Route path="/minha-conta" element={<MinhaConta />} />
            </Route>
          </Route>

          {/* Minha Conta dos demais cargos usa o layout administrativo. */}
          <Route element={<RoleRoute allowedRoles={["MANAGER", "WAITER", "CASHIER"]} />}>
            <Route element={<DefaultLayout />}>
              <Route path="/minha-conta" element={<MinhaConta />} />
            </Route>
          </Route>

          {/* Cadastro de usuário - somente ADMIN */}
          <Route element={<RoleRoute allowedRoles={["MANAGER"]} />}>
            <Route path="/cadastro" element={<CadastroFuncionario />} />
          </Route>
        </Route>

        <Route path="*" element={<Pg404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
