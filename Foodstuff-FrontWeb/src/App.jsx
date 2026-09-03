import "./style.css";
import { BrowserRouter, Route, Router, Routes } from "react-router-dom";
import { useState } from "react";
import Pg404 from "./pages/404/pg404";
import Login from "./pages/login/Login";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="*" element={<Pg404 />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
