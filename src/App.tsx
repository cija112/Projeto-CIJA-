import { Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Login from "./pages/auth/login/login";
import Cadastro from "./pages/auth/cadastro/cadastroCliente";
import RecuperarSenha from "./pages/auth/recuperarSenha/recuperarSenhaSendEmail";
import CriarNovaSenha from "pages/auth/recuperarSenha/criarSenha";
import LoginEmpresa from "./pages/auth/login/loginEmpresa";
import CadastroEmpresa from "./pages/auth/cadastro/cadastroEmpresa";
import ConfirmarEmail from "pages/auth/cadastro/confirmarEmail";
import ClientDashboard from "pages/app/cliente/dashboard/clienteDasboard";
import Vagas from "pages/app/cliente/vagas/vagas";
import VagaSelecionada from "pages/app/cliente/vagas/vagaSelecionada";
import Mensagens from "pages/app/cliente/mensagens";
import Perfil from "pages/app/cliente/perfil";
import Favoritos from "pages/app/cliente/favoritos";
import Candidaturas from "pages/app/cliente/candidaturas";
import RevisarCurriculo from "pages/app/cliente/vagas/revisarCurriculo";
import BuscarUsers from "pages/app/cliente/buscarUsers/buscarUser";
import CandidatarPadrao from "pages/app/cliente/candidatarPadrao";
import PreEntrevistasJovem from "pages/app/cliente/preEntrevistasJovem";
import MenuEmpresa from "pages/app/empresa/menuEmpresa";
import MensagemEmpresa from "pages/app/empresa/mensagemEmpresa";
import PerfilEmpresa from "pages/app/empresa/perfilEmpresa";
import VagasEmpresa from "pages/app/empresa/vagasEmpresa";
import CandidatosEmpresa from "pages/app/empresa/candidatosEmpresa";
import PreEntrevistaEmpresa from "pages/app/empresa/preEntrevista";
import PreEntrevistas from "pages/app/empresa/preEntrevista";
import ProtectedRoute from "./routes/ProtectedRoute";
import Page404 from "pages/security/page404";
import Ajuda from "routes/ajudaSystem";

function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>

        {/* ================================================= */}
        {/* ROTAS PÚBLICAS */}
        {/* ================================================= */}

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/cadastro"
          element={<Cadastro />}
        />

        <Route
          path="/recuperar-senha"
          element={<RecuperarSenha />}
        />

        <Route
          path="/criar-senha"
          element={<CriarNovaSenha />}
        />

        <Route
          path="/ajuda"
          element={<Ajuda />}
        />

        <Route
          path="/loginEmpresa"
          element={<LoginEmpresa />}
        />

        <Route
          path="/cadastroEmpresa"
          element={<CadastroEmpresa />}
        />

        <Route
          path="/confirmar-email"
          element={<ConfirmarEmail />}
        />


        {/* ================================================= */}
        {/* ROTAS DO JOVEM APRENDIZ */}
        {/* ================================================= */}

        <Route
          path="/clientDashboard"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <ClientDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buscarUsers"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <BuscarUsers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidaturas"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <Candidaturas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vagas"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <Vagas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vaga-selecionada/:id"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <VagaSelecionada />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mensagens"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <Mensagens />
            </ProtectedRoute>
          }
        />

        <Route
          path="/favoritos"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <Favoritos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/revisar-curriculo/:id"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <RevisarCurriculo />
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <Perfil />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidatarPadrao/:id"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <CandidatarPadrao />
            </ProtectedRoute>
          }
        />

        <Route
          path="/preEntrevistasJovem/:id"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <PreEntrevistasJovem />
            </ProtectedRoute>
          }/>
        <Route
          path="/preEntrevistasJovem"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <PreEntrevistasJovem />
            </ProtectedRoute>
          }
          />



        {/* ================================================= */}
        {/* JOVEM VISUALIZANDO PERFIL DE UMA EMPRESA */}
        {/* ================================================= */}

        <Route
          path="/empresa/:id_em"
          element={
            <ProtectedRoute tipoEsperado="jovem_aprendiz">
              <PerfilEmpresa />
            </ProtectedRoute>
          }
        />


        {/* ================================================= */}
        {/* ROTAS DA EMPRESA */}
        {/* ================================================= */}

        {/* Menu principal da empresa */}

        <Route
          path="/menuEmpresa"
          element={
            <ProtectedRoute tipoEsperado="empresa">
              <MenuEmpresa />
            </ProtectedRoute>
          }
        />

        {/* Mensagens da empresa */}

        <Route
          path="/mensagensEmpresa"
          element={
            <ProtectedRoute tipoEsperado="empresa">
              <MensagemEmpresa />
            </ProtectedRoute>
          }
        />

        {/* Alias para mensagens */}

        <Route
          path="/mensagemEmpresa"
          element={
            <ProtectedRoute tipoEsperado="empresa">
              <MensagemEmpresa />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* PERFIL DA EMPRESA LOGADA */}
        {/* ================================================= */}

        <Route
          path="/perfilEmpresa"
          element={
            <ProtectedRoute tipoEsperado="empresa">
              <PerfilEmpresa />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* VAGAS DA EMPRESA */}
        {/* ================================================= */}

        <Route
          path="/vagasEmpresa"
          element={
            <ProtectedRoute tipoEsperado="empresa">
              <VagasEmpresa />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* CANDIDATOS DA EMPRESA */}
        {/* ================================================= */}

        <Route
          path="/candidatosEmpresa"
          element={
            <ProtectedRoute tipoEsperado="empresa">
              <CandidatosEmpresa />
            </ProtectedRoute>
          }
        />

        {/* ================================================= */}
        {/* PRÉ-ENTREVISTAS */}
        {/* ================================================= */}

        <Route
          path="/preEntrevistas"
          element={
            <ProtectedRoute tipoEsperado="empresa">
              <PreEntrevistas />
            </ProtectedRoute>
          }
        />

        {/* Mantém compatibilidade com a rota antiga */}

        <Route
          path="/preEntrevisas"
          element={
            <ProtectedRoute tipoEsperado="empresa">
              <PreEntrevistas />
            </ProtectedRoute>
          }
        />

        {/* Pré-entrevista específica */}

        <Route
          path="/preEntrevista"
          element={
            <ProtectedRoute tipoEsperado="empresa">
              <PreEntrevistaEmpresa />
            </ProtectedRoute>
          }
        />


        {/* ================================================= */}
        {/* CATCH-ALL */}
        {/* ================================================= */}

        <Route
          path="*"
          element={<Page404 />}
        />

      </Routes>
    </AnimatePresence>
  );
}

export default App;
