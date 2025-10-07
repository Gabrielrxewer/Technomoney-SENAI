import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import Home from "./components/Home/Home";
import Login from "./components/Login/Login";
import Register from "./components/Login/Register";
import Dashboard from "./components/Dashboard/Dashboard";
import PortfolioPage from "./components/Portfolio/PortfolioPage";
import StockDetail from "./components/Dashboard/StocksDetail/StocksDetail";

import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./private/PrivateRoute";
import PortfolioPage from "./components/Portfolio/PortfolioPage";

import "./components/Portfolio/styles/tokens.css";
import "./components/Portfolio/styles/globals.css";

const queryClient = new QueryClient();

function App() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITEKEY as string}
      scriptProps={{ async: true, defer: true }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Header />
            <Routes>
              {/* Rotas principais */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Rotas protegidas */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/portfolio"
                element={
                  <PrivateRoute>
                    <PortfolioPage />
                  </PrivateRoute>
                }
              />

              {/* Nova rota para a página de detalhes de ação */}
              <Route
                path="/stock-detail"
                element={
                  <PrivateRoute>
                    <StockDetail/>
                  </PrivateRoute>
                }
              />
            </Routes>
            <Footer />
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </GoogleReCaptchaProvider>
  );
}

export default App;
