import "./style.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Pg404 from "./pages/404/pg404";
import Login from "./pages/login/Login";
import RecupSenha from "./pages/recupSenha/RecupSenha";
import CadastroFuncionario from "./pages/cadastro/CadastroFuncionario";
import Home from "./pages/home/Home";
import ProtectedRoute from "./components/protectedRoute/ProtectedRoute";

import DefaultLayout from "./layouts/DefaultLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/recuperarSenha" element={<RecupSenha />} />

        {/* Protegidas */}
        <Route element={<ProtectedRoute/>}>
          <Route element={<DefaultLayout/>}>
            <Route path="/home" element={<Home />} />
            <Route path="/cadastro" element={<CadastroFuncionario />} />
          </Route>
        </Route>

        <Route path="*" element={<Pg404 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
