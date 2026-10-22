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

import DefaultLayout from "./components/defaultLayout/DefaultLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/recuperarSenha" element={<RecupSenha />} />

        {/* Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DefaultLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/mesas" element={<Mesas />} />
            <Route path="/minha-conta" element={<MinhaConta />} />
            <Route path="/equipe" element={<Equipe />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/cardapio" element={<Cardapio />} />
          </Route>
          <Route path="/cozinha" element={<Cozinha />} />
          <Route path="/cadastro" element={<CadastroFuncionario />} />
        </Route>

        <Route path="*" element={<Pg404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
