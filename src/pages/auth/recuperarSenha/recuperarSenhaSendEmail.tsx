/* eslint-disable jsx-a11y/anchor-is-valid */

import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import styles from "./recuperarSenha.module.css";
import { supabase } from "supabaseClient";
import cija_logo from "../../../assets/logo2.png";

export default function RecuperarSenha() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // evita múltiplos envios
  const [sentOnce, setSentOnce] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate("/");
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const triggerErrorAnimation = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleRecuperar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (sentOnce) return;

    // valida email
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Por favor, insira um formato de email válido.");
      triggerErrorAnimation();
      return;
    }

    setLoading(true);

    try {
      await supabase.rpc("check_email_exists", {
        p_email: email.trim(),
      });

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/criar-senha?type=recovery`,
        },
      );

      if (resetError) {
        throw new Error(resetError.message);
      }

      setSentOnce(true);
      setSuccess(true);
    } catch (e: any) {
      setError(
        "Se o e-mail informado estiver cadastrado, enviaremos um link de recuperação. Verifique também a caixa de spam.",
      );
      triggerErrorAnimation();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setEmail(e.target.value);
  };

  const cardClasses = `
    ${styles["recuperar-card"]}
    ${isShaking ? styles.shake : ""}
    ${success ? styles.success : ""}
  `;

  return (
    <div className={styles.wrapper}>
    
      <img src={cija_logo} className={styles["desktop-logo"]} alt="CIJA Logo" />

      <div className={cardClasses.trim()}>
        {success ? (
          <div className={styles["success-animation"]}>
            <svg
              className={styles.checkmark}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 52 52"
            >
              <circle
                className={styles.checkmark__circle}
                cx="26"
                cy="26"
                r="25"
              />
              <path
                className={styles.checkmark__check}
                fill="none"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>

            <h2>Link Enviado!</h2>
            <p className={styles.subtitle}>
              Verifique seu email. Redirecionando...
            </p>
          </div>
        ) : (
          <div className={styles["card-content"]}>
            <img
              src={cija_logo}
              className={styles["mobile-logo"]}
              alt="CIJA Logo"
            />

            <h2>Recuperar Senha</h2>

            <p className={styles.subtitle}>
              Insira seu email para enviarmos um link de recuperação.
            </p>

            <form onSubmit={handleRecuperar} noValidate>
              <div className={styles["input-group"]}>
                <input
                  type="email"
                  placeholder="Seu email de cadastro"
                  value={email}
                  onChange={handleEmailChange}
                  className={`${styles.input} ${
                    error ? styles["input-error"] : ""
                  }`}
                />

                {error && <p className={styles["error-message"]}>{error}</p>}
              </div>

              <button
                type="submit"
                className={styles["action-button"]}
                disabled={loading}
              >
                {loading ? "Verificando..." : "Enviar Link"}
              </button>
            </form>

            <p className={styles["back-link"]}>
              Lembrou a senha?{" "}
              <a onClick={() => navigate(-1)}>Voltar</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
