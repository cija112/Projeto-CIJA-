import { useEffect, useState, ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "supabaseClient";

interface ProtectedRouteProps {
  children: ReactNode;
  tipoEsperado: "jovem_aprendiz" | "empresa";
}

export default function ProtectedRoute({
  children,
  tipoEsperado,
}: ProtectedRouteProps) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [isJovem, setIsJovem] = useState(false);
  const [isEmpresa, setIsEmpresa] = useState(false);
  const [emailConfirmado, setEmailConfirmado] = useState(true);
  const [timerConcluido, setTimerConcluido] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checarIdentidade() {
      try {
        // =========================================================
        // 1. PEGAR A SESSÃO ATUAL
        // =========================================================
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Erro ao recuperar sessão:", sessionError);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        const session = data.session;


        // =========================================================
        //  NÃO ESTÁ LOGADO
        // =========================================================
        if (!session?.user) {
          console.log("Nenhum usuário autenticado.");
          if (mounted) {
            setIsJovem(false);
            setIsEmpresa(false);
            setLoading(false);
          }
          return;
        }

        const user = session.user;
        const userId = user.id;
        const emailAuth = user.email?.trim().toLowerCase();
        const nomeAuth =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          ""

        
        // Resetar estados
        if (mounted) {
          setIsJovem(false);
          setIsEmpresa(false);
          setEmailConfirmado(true);
        }

        let jovem: any = null;
        let empresa: any = null;

        // =========================================================
        //  VERIFICAÇÃO DIRECIONADA PELO TIPO ESPERADO (EVITA CONFLITOS)
        // =========================================================
        if (tipoEsperado === "empresa") {
          // --- FLUXO EMPRESA ---
          const { data: empresaPorId, error: empresaIdError } = await supabase
            .from("empresa")
            .select("*")
            .eq("id_em", userId)
            .maybeSingle();

          if (empresaIdError) {
            console.error("Erro ao buscar empresa pelo ID:", empresaIdError);
          }
          empresa = empresaPorId || null;

          if (!empresa && emailAuth) {
            const { data: empresaPorEmail, error: empresaEmailError } =
              await supabase
                .from("empresa")
                .select("*")
                .eq("email", emailAuth)
                .maybeSingle();

            if (empresaEmailError) {
              console.error(
                "Erro ao buscar empresa pelo email:",
                empresaEmailError,
              );
            }
            empresa = empresaPorEmail || null;
          }

          if (empresa) {
            console.log("Usuário identificado como EMPRESA.");
            console.log("ID Auth:", userId);
            console.log("ID empresa:", empresa.id_em);

            if (mounted) {
              setIsEmpresa(true);
              setIsJovem(false);
              setLoading(false);
            }
            return;
          }
        } else {
          // --- FLUXO JOVEM APRENDIZ ---
          const { data: jovemPorId, error: jovemIdError } = await supabase
            .from("jovem_aprendiz")
            .select("*")
            .eq("id_ja", userId)
            .maybeSingle();

          if (jovemIdError) {
            console.error("Erro ao buscar jovem pelo ID:", jovemIdError);
          }
          jovem = jovemPorId || null;

          if (!jovem && emailAuth) {
            const { data: jovemPorEmail, error: jovemEmailError } =
              await supabase
                .from("jovem_aprendiz")
                .select("*")
                .eq("email", emailAuth)
                .maybeSingle();

            if (jovemEmailError) {
              console.error(
                "Erro ao buscar jovem pelo email:",
                jovemEmailError,
              );
            }
            jovem = jovemPorEmail || null;
          }

          if (!jovem && emailAuth) {
            console.log("Jovem não encontrado. Tentando criar...");
            const { data: novoJovem, error: insertError } = await supabase
              .from("jovem_aprendiz")
              .upsert(
                {
                  id_ja: userId,
                  email: emailAuth,
                  nome: nomeAuth,
                  email_confirmado: true,
                },
                { onConflict: "id_ja" },
              )
              .select()
              .single();

            if (insertError) {
              console.error("Erro ao criar jovem:", {
                mensagem: insertError.message,
                detalhes: insertError.details,
                dica: insertError.hint,
                codigo: insertError.code,
              });
            } else {
              jovem = novoJovem;
              console.log("Novo jovem criado:", novoJovem);
            }
          }

          if (jovem) {
            const verificado =
              jovem.email_confirmado === true ||
              String(jovem.email_confirmado).toLowerCase() === "true";

            console.log("Usuário identificado como JOVEM.");
            console.log("Email confirmado:", verificado);

            if (mounted) {
              setIsJovem(true);
              setIsEmpresa(false);
              setEmailConfirmado(verificado);
              setLoading(false);
            }
            return;
          }
        }

        // =========================================================
        // FALLBACK / BUSCA CRUZADA (Caso o usuário esteja na rota errada)
        // =========================================================
        if (tipoEsperado === "empresa") {
          const { data: jovemAlt } = await supabase
            .from("jovem_aprendiz")
            .select("*")
            .or(`id_ja.eq.${userId},email.eq.${emailAuth || ""}`)
            .maybeSingle();

          if (jovemAlt) {
            console.log("Usuário encontrado em jovem_aprendiz (tipo errado).");
            if (mounted) {
              setIsJovem(true);
              setIsEmpresa(false);
              setLoading(false);
            }
            return;
          }
        } else {
          const { data: empresaAlt } = await supabase
            .from("empresa")
            .select("*")
            .or(`id_em.eq.${userId},email.eq.${emailAuth || ""}`)
            .maybeSingle();

          if (empresaAlt) {
            console.log("Usuário encontrado em empresa (tipo errado).");
            if (mounted) {
              setIsEmpresa(true);
              setIsJovem(false);
              setLoading(false);
            }
            return;
          }
        }

        // =========================================================
        // 5. NENHUM ENCONTRADO
        // =========================================================
        console.warn(
          "Usuário autenticado, mas não encontrado em jovem_aprendiz ou empresa.",
        );

        if (mounted) {
          setIsJovem(false);
          setIsEmpresa(false);
          setLoading(false);
        }
      } catch (err) {
        console.error("Erro ao validar identidade:", err);
        if (mounted) {
          setIsJovem(false);
          setIsEmpresa(false);
          setLoading(false);
        }
      }
    }

    checarIdentidade();

    return () => {
      mounted = false;
    };
  }, [tipoEsperado]);

  // =============================================================
  // VERIFICAÇÃO DE ACESSO
  // =============================================================
  const temAcesso =
    (tipoEsperado === "jovem_aprendiz" && isJovem) ||
    (tipoEsperado === "empresa" && isEmpresa);

  // =============================================================
  // TIMER PARA ACESSO INCORRETO
  // =============================================================
  useEffect(() => {
    if (!loading && !temAcesso && (isJovem || isEmpresa)) {
      setTimerConcluido(false);

      const timer = setTimeout(() => {
        setTimerConcluido(true);
      }, 3500);

      return () => clearTimeout(timer);
    }

    setTimerConcluido(false);
  }, [loading, temAcesso, isJovem, isEmpresa]);

  // =============================================================
  // LOADING 
  // =============================================================
  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at top, #18052d 0%, #07010f 65%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "'Poppins', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "90%",
            maxWidth: 380,
            background:
              "linear-gradient(180deg, rgba(24,12,42,0.85) 0%, rgba(11,4,20,0.9) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
            padding: "44px 32px",
            backdropFilter: "blur(24px)",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 24px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.08)",
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "3px solid transparent",
                borderTopColor: "#a855f7",
                borderRightColor: "#9333ea",
                animation: "spin 0.85s linear infinite",
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 10,
                borderRadius: "50%",
                background: "rgba(168,85,247,0.1)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          </div>

          <h2
            style={{
              margin: "auto",
              color: "white",
              fontSize: 20,
              textAlign: "center",
              fontWeight: 700,
              letterSpacing: "-0.3px",
            }}
          >
            Autenticando aguarde
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: "#a8a3b7",
              fontSize: 14,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Sincronizando suas credenciais CIJA...
          </p>

          <div
            style={{
              marginTop: 28,
              height: 4,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 99,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "40%",
                background: "linear-gradient(90deg, #9333ea, #c084fc)",
                borderRadius: 99,
                animation: "load 4.0s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        <style>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes pulse {
            0%,100% {
              opacity: 0.6;
              transform: scale(0.95);
            }

            50% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes load {
            0% {
              transform: translateX(-120%);
            }

            50% {
              transform: translateX(250%);
            }

            100% {
              transform: translateX(-120%);
            }
          }
        `}</style>
      </div>
    );
  }

  // =============================================================
  // USUÁRIO NÃO ENCONTRADO
  // =============================================================
  if (!isJovem && !isEmpresa) {
    return tipoEsperado === "empresa" ? (
      <Navigate to="/loginEmpresa" replace />
    ) : (
      <Navigate to="/" replace />
    );
  }

  // =============================================================
  // EMAIL DO JOVEM NÃO CONFIRMADO
  // =============================================================
  if (isJovem && !emailConfirmado) {
    if (location.pathname !== "/confirmar-email") {
      return <Navigate to="/confirmar-email" replace />;
    }

    return <>{children}</>;
  }

  // =============================================================
  // USUÁRIO É DO TIPO ERRADO
  // =============================================================
  if (!temAcesso) {
    if (timerConcluido) {
      return tipoEsperado === "empresa" ? (
        <Navigate to="/loginEmpresa" replace />
      ) : (
        <Navigate to="/" replace />
      );
    }

    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07010f",
          fontFamily: "'Poppins', sans-serif",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "rgba(24,12,42,0.9)",
            padding: 40,
            borderRadius: 20,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            textAlign: "center",
            maxWidth: 420,
            width: "100%",
            border: "1px solid rgba(255,255,255,0.08)",
            borderTop: "4px solid #ef4444",
          }}
        >
          <h2
            style={{
              color: "white",
              margin: "0 0 10px",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Acesso Restrito
          </h2>

          <p
            style={{
              color: "#a8a3b7",
              margin: "0 0 24px",
              fontSize: 15,
            }}
          >
            Esta área é exclusiva para{" "}
            {tipoEsperado === "empresa" ? "Empresas" : "Jovens Aprendizes"}.
          </p>

          <div
            style={{
              color: "#71717a",
              fontSize: 13,
            }}
          >
            Redirecionando em instantes...
          </div>
        </div>
      </div>
    );
  }

  // =============================================================
  // ACESSO LIBERADO
  // =============================================================
  return <>{children}</>;
}
