import "./style.css";
import { BrowserRouter, Route, Router, Routes } from "react-router-dom";
import { useState } from "react";
import Pg404 from "./pages/404/pg404";
import Login from "./pages/login/Login";
import RecupSenha from "./pages/recupSenha/RecupSenha";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="*" element={<Pg404 />} />
          <Route path="/recuperarSenha" element={<RecupSenha/>}/>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
