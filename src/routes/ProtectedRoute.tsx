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
    const aguardarTempo = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    async function checarIdentidade() {
      try {
        const dadosSessionPromise = supabase.auth.getSession();
        const delayPromise = aguardarTempo(1500);

        const [sessionResult] = await Promise.all([
          dadosSessionPromise,
          delayPromise,
        ]);
        const session = sessionResult.data.session;

        if (!session?.user) {
          if (mounted) setLoading(false);
          return;
        }

        const userId = session.user.id;
        const emailAuth = session.user.email?.trim().toLowerCase();
        const nomeAuth =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          "Usuário Google";

        // 1. Jovem (Buscando pela coluna correta 'id_ja')
        let { data: jovem } = await supabase
          .from("jovem_aprendiz")
          .select("*")
          .eq("id_ja", userId)
          .maybeSingle();

        if (!jovem && emailAuth) {
          const { data: jovemPorEmail } = await supabase
            .from("jovem_aprendiz")
            .select("*")
            .eq("email", emailAuth)
            .maybeSingle();
          jovem = jovemPorEmail || null;
        }

        // Se logou via Google mas ainda não tem linha na tabela, cria automaticamente usando 'id_ja'
        if (!jovem && tipoEsperado === "jovem_aprendiz" && emailAuth) {
          const { data: novoJovem, error: insertError } = await supabase
            .from("jovem_aprendiz")
            .upsert([
              {
                id_ja: userId, 
                email: emailAuth,
                nome: nomeAuth,
                email_confirmado: true,
              },
            ],
            { onConflict: "id_ja" }
          )
            .select()
            .single();

          if (!insertError && novoJovem) {
            jovem = novoJovem;
          } else if (insertError) {
           console.error("Erro detalhado do Supabase:", {
              mensagem: insertError.message,
              detalhes: insertError.details,
              dica: insertError.hint,
              codigo: insertError.code
            });
          
          }
        }

        if (jovem) {
          if (mounted) {
            setIsJovem(true);
            const verificado =
              jovem.email_confirmado === true ||
              String(jovem.email_confirmado) === "true";
            setEmailConfirmado(verificado);
            setLoading(false);
          }
          return;
        }

        // 2. Empresa (Busca por id_em)
        let { data: empresa } = await supabase
          .from("empresa")
          .select("*")
          .eq("id_em", userId)
          .maybeSingle();

        if (!empresa && emailAuth) {
          const { data: empresaPorEmail } = await supabase
            .from("empresa")
            .select("*")
            .eq("email", emailAuth)
            .maybeSingle();
          empresa = empresaPorEmail || null;
        }

        if (empresa) {
          if (mounted) {
            setIsEmpresa(true);
            setLoading(false);
          }
          return;
        }

        if (mounted) setLoading(false);
      } catch (err) {
        console.error("Erro ao validar identidade:", err);
        if (mounted) setLoading(false);
      }
    }

    checarIdentidade();
    return () => {
      mounted = false;
    };
  }, [tipoEsperado]);

  const temAcesso =
    (tipoEsperado === "jovem_aprendiz" && isJovem) ||
    (tipoEsperado === "empresa" && isEmpresa);

  useEffect(() => {
    if (!loading && !temAcesso && (isJovem || isEmpresa)) {
      const timer = setTimeout(() => setTimerConcluido(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, temAcesso, isJovem, isEmpresa]);

  // ==================== TELA DE CARREGAMENTO ====================
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
          {/* Spinner */}
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
              margin: 0,
              color: "white",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.3px",
            }}
          >
            Autenticando via Google
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              color: "#a8a3b7",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Sincronizando suas credenciais CIJA...
          </p>

          {/* Barra de progresso */}
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
                animation: "load 2.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1); } }
          @keyframes load { 0% { transform: translateX(-120%); } 50% { transform: translateX(250%); } 100% { transform: translateX(-120%); } }
        `}</style>
      </div>
    );
  }

  if (!isJovem && !isEmpresa) {
    return tipoEsperado === "empresa" ? (
      <Navigate to="/loginEmpresa" replace />
    ) : (
      <Navigate to="/" replace />
    );
  }

  if (isJovem && !emailConfirmado) {
    if (location.pathname !== "/confirmar-email") {
      return <Navigate to="/confirmar-email" replace />;
    }
    return <>{children}</>;
  }

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
          <p style={{ color: "#a8a3b7", margin: "0 0 24px", fontSize: 15 }}>
            Esta área é exclusiva para{" "}
            {tipoEsperado === "empresa" ? "Empresas" : "Jovens Aprendizes"}.
          </p>
          <div style={{ color: "#71717a", fontSize: 13 }}>
            Redirecionando em instantes...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
