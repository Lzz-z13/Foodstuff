import "./style.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Pg404 from "./pages/404/pg404";
import Login from "./pages/login/Login";
import RecupSenha from "./pages/recupSenha/RecupSenha";
import CadastroFuncionario from "./pages/cadastro/CadastroFuncionario";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/cadastro" element={<CadastroFuncionario />} />
          <Route path="/" element={<Login />} />
          <Route path="*" element={<Pg404 />} />
          <Route path="/recuperarSenha" element={<RecupSenha />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
