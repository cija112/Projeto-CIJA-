/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./loginEmpresa.module.css";

import { supabase } from "supabaseClient";

import cija_logo from "../../../assets/logo2.png";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
import EyeOpenIcon from "../../../components/icons/EyeOpenIcon";
import EyeClosedIcon from "../../../components/icons/EyeClosedIcon";
import {
  Building2, // CNPJ/Empresa

} from "lucide-react";

export default function LoginEmpresa() {
  const navigate = useNavigate();
  useDocumentTitle("CIJA - Login Empresarial");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalNotificacao, setGlobalNotificacao] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const [isShaking, setIsShaking] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (globalNotificacao) {
      const timer = setTimeout(() => {
        setGlobalNotificacao(null);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [globalNotificacao]);

  const triggerErrorAnimation = () => {
    setIsShaking(true);

    setTimeout(() => {
      setIsShaking(false);
    }, 500);
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Digite um email válido.";
    }

    if (!senha.trim()) {
      newErrors.senha = "Digite sua senha.";
    }

    return newErrors;
  };

  const fazerLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setGlobalNotificacao(null);

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      triggerErrorAnimation();
      return;
    }

    setLoading(true);

    try {
      const emailFormatado = email.trim().toLowerCase();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: emailFormatado,
          password: senha,
        });

      if (authError || !authData.user) {
        throw new Error("E-mail ou senha inválidos.");
      }

      // Busca dados extras da tabela empresa para validação de role e confirmação
      const { data: empresa, error: empresaError } = await supabase
        .from("empresa")
        .select("email, email_confirmado")
        .eq("id_em", authData.user.id)
        .maybeSingle();

      if (empresaError || !empresa) {
        await supabase.auth.signOut();
        throw new Error("E-mail ou senha inválidos.");
      }

      // CORREÇÃO DE ROTA DE EMAIL: Impede login de empresa não confirmada
      if (!empresa.email_confirmado) {
        setLoginSuccess(false);

        // Limpa a sessão local para permitir novos disparos sem travar a biblioteca do Supabase
        await supabase.auth.signOut();

        navigate("/confirmar-email", {
          replace: true,
          state: { vindoDoLogin: true, emailAlvo: emailFormatado },
        });
        return;
      }

      setLoginSuccess(true);

      setTimeout(() => {
        navigate("/menuEmpresa");
      }, 2400);
    } catch (err: any) {
      setGlobalNotificacao(err.message || "Erro ao realizar login.");

      triggerErrorAnimation();
    } finally {
      setLoading(false);
    }
  };

  const cardClasses = `
    ${styles.loginCard}
    ${isShaking ? styles.shake : ""}
  `;

  return (
    <div className={styles.wrapper}>


      {globalNotificacao && (
        <div className={styles.alert}>{globalNotificacao}</div>
      )}

      <img src={cija_logo} alt="CIJA" className={styles.desktopLogo} />

      <div className={styles.loginContainer}>
        <div className={styles.left}>
          <span className={styles.badge}>Plataforma Empresarial</span>

          <h1>
            Recrute novos
            <br />
            <span>talentos</span> com
            <br />o CIJA.
          </h1>

          <p className={styles.tagline}>
            Conectamos empresas a jovens aprendizes preparados para iniciar uma
            carreira na área da tecnologia.
          </p>

         
        </div>

        <div className={cardClasses}>
          {loginSuccess ? (
            <div className={styles.successAnimation}>
              <svg
                className={styles.checkmark}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 52 52"
              >
                <circle
                  className={styles.checkmarkCircle}
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                />

                <path
                  className={styles.checkmarkCheck}
                  fill="none"
                  d="M14 27l7 7 17-17"
                />
              </svg>

              <h2>Login realizado!</h2>

              <p>Redirecionando...</p>
            </div>
          ) : (
            <div className={styles.cardContent}>
              <img src={cija_logo} alt="CIJA" className={styles.mobileLogo} />

              <h2>Login Empresarial</h2>

              <p>Acesse o painel administrativo da sua empresa.</p>

              <form onSubmit={fazerLogin} noValidate>
                <div className={styles.inputGroup}>
                  <label>Email corporativo</label>

                  <input
                    type="email"
                    placeholder="empresa@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${styles.input} ${
                      errors.email ? styles.error : ""
                    }`}
                  />
                  <Building2 size={45} className={styles.inputIcon} />

                  {errors.email && (
                    <p className={styles.errorMessage}>{errors.email}</p>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label>Senha</label>

                  <div className={styles.senhaBox}>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className={`${styles.input} ${
                        errors.senha ? styles.error : ""
                      }`}
                    />

                    <button
                      type="button"
                      className={styles.toggleSenha}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </button>
                  </div>

                  {errors.senha && (
                    <p className={styles.errorMessage}>{errors.senha}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className={styles.actionButton}
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar no Painel"}
                </button>
              </form>

              <div className={styles.footerActions}>
                <p className={styles.subLink}>
                  <a onClick={() => navigate("/recuperar-senha")}>
                    Esqueceu sua senha?
                  </a>
                </p>

                <div className={styles.separator}>ou</div>

                <p className={styles.subLink}>
                  Não possui conta?{" "}
                  <a onClick={() => navigate("/cadastroEmpresa")}>
                    Criar conta empresarial
                  </a>
                </p>

                <p className={styles.subLink}>
                  É um candidato?{" "}
                  <a onClick={() => navigate("/")}>Fazer login</a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
