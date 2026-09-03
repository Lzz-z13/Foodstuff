import "./style.css";
import { BrowserRouter, Route, Router, Routes } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/login/Login";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
