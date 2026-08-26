import {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
  FormEvent,
} from "react";

import { useLocation, useNavigate } from "react-router-dom";

import styles from "./confirmarEmail.module.css";

import { supabase } from "supabaseClient";

import cija_logo from "../../../assets/logo2.png";

function AnimatedCheckIcon() {
  return (
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
        d="M14.1 27.2l7.1 7.2 16.7-16.8"
      />
    </svg>
  );
}

export default function ConfirmarEmail() {
  const location = useLocation();

  const navigate = useNavigate();

  const emailAlvo = location.state?.emailAlvo || "";

  const tipoUsuario = location.state?.tipoUsuario || "jovem_aprendiz";

  const [codigo, setCodigo] = useState<string[]>(Array(6).fill(""));

  const [timer, setTimer] = useState(180);

  const [canResend, setCanResend] = useState(true);

  const [timerAtivo, setTimerAtivo] = useState(false);

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const [message, setMessage] = useState(
    "Insira o código de 6 dígitos recebido em seu e-mail.",
  );

  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (!emailAlvo) {
      setMessage("Erro: identificação do usuário não encontrada.");
      setMessageType("error");
    }
  }, [emailAlvo]);

  useEffect(() => {
    if (!timerAtivo) return;

    if (timer <= 0) {
      setCanResend(true);
      setTimerAtivo(false);
      return;
    }

    const countdown = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(countdown);
  }, [timer, timerAtivo]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);

    const secs = seconds % 60;

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const { value } = e.target;

    if (value && !/^\d+$/.test(value)) return;

    const novoCodigo = [...codigo];

    novoCodigo[index] = value.substring(value.length - 1);

    setCodigo(novoCodigo);

    if (messageType === "error") {
      setMessage("");
      setMessageType("");
    }

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !codigo[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .substring(0, 6);

    if (pastedData.length === 6) {
      setCodigo(pastedData.split(""));

      inputRefs.current[5]?.focus();
    }
  };

  const traduzirErroSupabase = (msg: string): string => {
    const erro = msg.toLowerCase();

    if (erro.includes("expired") || erro.includes("invalid")) {
      return "Código inválido ou expirado.";
    }

    if (erro.includes("rate limit")) {
      return "Muitas tentativas. Aguarde alguns minutos.";
    }

    return `Erro: ${msg}`;
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();

    const tokenCompleto = codigo.join("");

    if (tokenCompleto.length !== 6) {
      setMessage("Por favor, preencha todos os 6 dígitos.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    setMessage("");

    setMessageType("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailAlvo,
        token: tokenCompleto,
        type: "email",
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Usuário não encontrado.");
      }

      await realizarConfirmacaoNoBanco();
    } catch (err: any) {
      console.error("Erro na verificação:", err);

      setMessage(traduzirErroSupabase(err.message || ""));

      setMessageType("error");

      setCodigo(Array(6).fill(""));

      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const realizarConfirmacaoNoBanco = async () => {
    try {
      const {
        data: { user: authedUser },
      } = await supabase.auth.getUser();

      const userId = authedUser?.id;
      if (!userId) {
        throw new Error("Sessão inválida após verificação do código.");
      }

      const tabela =
        tipoUsuario === "jovem_aprendiz" ? "jovem_aprendiz" : "empresa";
      const idCol =
        tipoUsuario === "jovem_aprendiz" ? "id_ja" : "id_em";

      const { error } = await supabase
        .from(tabela)
        .update({
          email_confirmado: true,
        })
        .eq(idCol, userId);

      if (error) throw error;

      setSuccess(true);

      setMessage("Sua conta foi ativada com sucesso!");

      setMessageType("success");

      setTimeout(() => {
        if (tipoUsuario === "jovem_aprendiz") {
          navigate("/clientDashboard", {
            replace: true,
          });
        } else {
          navigate("/dashboardEmpresa", {
            replace: true,
          });
        }
      }, 2500);
    } catch (dbError: any) {
      console.error("Erro no banco:", dbError);

      setMessage("Código aceito, mas ocorreu um erro ao atualizar seu status.");

      setMessageType("error");
    }
  };

  const handleResendEmail = async () => {
    if (!canResend || !emailAlvo) return;

    setLoading(true);

    setCanResend(false);

    setTimer(180);

    setCodigo(Array(6).fill(""));

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailAlvo,

        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setMessage("Um novo código foi enviado!");

      setMessageType("success");

      setTimerAtivo(true);

      inputRefs.current[0]?.focus();
    } catch (err: any) {
      console.error("Erro no reenvio:", err);

      setMessage(traduzirErroSupabase(err.message || ""));

      setMessageType("error");

      setCanResend(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.backgroundBlobs}>
        <div className={styles.blobTop}></div>
        <div className={styles.blobBottom}></div>
      </div>

      <img src={cija_logo} alt="Logo" className={styles.desktopLogo} />

      <div className={styles.container}>
        <div className={styles.leftContent}>
          <img src={cija_logo} alt="Logo" className={styles.mobileLogo} />

          <h1>
            Confirme seu
            <br />
            <span>e-mail!</span>
          </h1>

          <p className={styles.subtitle}>
            Digite o código enviado para seu e-mail para liberar o acesso
            completo à plataforma.
          </p>
        </div>

        <div className={styles.card}>
          {success ? (
            <div className={styles.successAnimation}>
              <AnimatedCheckIcon />

              <h2>Email confirmado!</h2>

              <p>
                Sua conta foi ativada com sucesso. Aguarde redirecionamento...
              </p>
            </div>
          ) : (
            <>
              <div className={styles.iconWrapper}>
                <svg
                  className={styles.mailIcon}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-18 8h18a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <h2>Confirmar E-mail</h2>

              <p className={styles.instruction}>
                Digite o código de 6 dígitos enviado para:
              </p>

              <p className={styles.emailText}>{emailAlvo}</p>

              {message && (
                <div
                  className={`${styles.feedbackMessage} ${
                    messageType === "error" ? styles.error : styles.success
                  }`}
                >
                  {message}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className={styles.otpForm}>
                <div className={styles.otpInputGroup}>
                  {codigo.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        if (el) inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleInputChange(e, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={handlePaste}
                      className={`${styles.otpInput} ${
                        messageType === "error" ? styles.inputError : ""
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.actionButton}
                >
                  {loading ? "Verificando..." : "Confirmar Código"}
                </button>
              </form>

              <div className={styles.actionSection}>
                {canResend ? (
                  <button
                    onClick={handleResendEmail}
                    disabled={loading}
                    className={styles.resendButton}
                  >
                    Reenviar código
                  </button>
                ) : (
                  <div className={styles.timerBox}>
                    <span>Você poderá reenviar em</span>

                    <span className={styles.countdown}>
                      {formatTime(timer)}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.footer}>
                <button
                  className={styles.backButton}
                  onClick={() => navigate(-1)}
                >
                  Voltar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
