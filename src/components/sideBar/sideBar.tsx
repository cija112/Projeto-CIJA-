import React, { useState, useEffect, useCallback } from "react";
import styles from "./Sidebar.module.css";
import cijaLogo from "../../assets/logo2.png";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { SearchIcon } from "lucide-react";

type MenuItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
};

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
);

const ClipboardCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    <path d="M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H3" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const DocumentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 19 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState("");
  const [naoLidas, setNaoLidas] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    document.body.classList.toggle(
      styles.sidebarOpenBody,
      isOpen && window.innerWidth <= 992
    );
  }, [isOpen]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        
        // CALCULA PERCENTUAL REAL
        const { data: ja } = await supabase
          .from("jovem_aprendiz")
          .select("*")
          .eq("id_ja", data.user.id)
          .maybeSingle();

        const { data: curr } = await supabase
          .from("curriculo")
          .select("*")
          .eq("id_ja", data.user.id)
          .maybeSingle();

        let pts = 0;
        if (ja?.avatar_url) pts += 15;
        if (ja?.nome?.length > 3) pts += 5;
        if (ja?.email) pts += 5;
        if (ja?.telefone?.replace(/\D/g, "").length >= 10) pts += 5;

        const desc = curr?.descricao?.length || 0;
        pts +=
          desc >= 100
            ? 20
            : desc >= 50
            ? 15
            : desc >= 20
            ? 8
            : desc > 0
            ? 3
            : 0;

        const skills =
          curr?.competencias?.split(",").filter(Boolean).length || 0;
        pts += Math.min(skills * 3, 15);

        try {
          const f = JSON.parse(curr?.curso || "[]");
          if (f.length) pts += f.length >= 2 ? 15 : 10;
        } catch {}

        try {
          const e = JSON.parse(curr?.experiencias || "{}").experiencias || [];
          pts += e.length >= 2 ? 20 : e.length === 1 ? 12 : 0;
        } catch {}

        setPercent(Math.min(pts, 100));
      }
    };
    init();
  }, []);

  const carregarNaoLidas = useCallback(async () => {
    if (!userId) return;

    const { count, error } = await supabase
      .from("mensagens")
      .select("*", { count: "exact", head: true })
      .eq("id_ja", userId)
      .eq("enviado_por_jovem", false)
      .eq("lida", false);

    if (!error) {
      setNaoLidas(count || 0);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    carregarNaoLidas();

    const channel = supabase
      .channel(`sidebar-mensagens-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mensagens",
          filter: `id_ja=eq.${userId}`,
        },
        () => {
          carregarNaoLidas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, carregarNaoLidas]);

  const menuItems: MenuItem[] = [
    { label: "Dashboard", path: "/clientDashboard", icon: <HomeIcon /> },
    { label: "Vagas", path: "/vagas", icon: <SearchIcon /> },
    {
      label: "Candidaturas",
      path: "/candidaturas",
      icon: <ClipboardCheckIcon />,
    },
    {
      label: "Pré-Entrevistas",
      path: "/preEntrevista",
      icon: <DocumentIcon />,
    },
    { label: "Favoritos", path: "/favoritos", icon: <HeartIcon /> },
    {
      label: "Mensagens",
      path: "/mensagens",
      icon: <MailIcon />,
      badge: naoLidas,
    },
    { label: "Meu Perfil", path: "/perfil", icon: <UserIcon /> },
  ];

  const handleNavigation = (path: string) => {
    if (isNavigating || location.pathname === path) return;
    setIsNavigating(true);
    navigate(path);
    setIsOpen(false);
    setTimeout(() => setIsNavigating(false), 300);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        <div className={`${styles.bar} ${isOpen ? styles.bar1 : ""}`}></div>
        <div className={`${styles.bar} ${isOpen ? styles.bar2 : ""}`}></div>
        <div className={`${styles.bar} ${isOpen ? styles.bar3 : ""}`}></div>
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.topContent}>
          <div className={styles.logoContainer}>
            <img src={cijaLogo} alt="CIJA" className={styles.logo} />
            <p className={styles.subtitle}>Centro de Integração</p>
            <p className={styles.title}>Jovem Aprendiz</p>
          </div>

          <nav className={styles.menu}>
            {menuItems.map((item) => (
              <button
                key={item.path}
                className={`${styles.menuItem} ${
                  location.pathname === item.path ? styles.active : ""
                }`}
                onClick={() => handleNavigation(item.path)}
                disabled={isNavigating}
              >
                <span className={styles.iconWrapper}>{item.icon}</span>
                <span className={styles.menuLabel}>{item.label}</span>
                {item.badge ? (
                  <span className={styles.badge}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>

        <div className={styles.bottomContent}>
          {percent < 100 && (
            <div className={styles.highlightCard}>
              <h4>Complete seu perfil</h4>
              <p>Quanto mais completo, maiores suas chances!</p>
              <div className={styles.progressWrap}>
                <span className={styles.percentText}>{percent}%</span>
                <div className={styles.progressBar}>
                  <div style={{ width: `${percent}%` }} />
                </div>
              </div>
              <button
                className={styles.improveBtn}
                onClick={() => handleNavigation("/curriculo")}
              >
                <TrendingUpIcon />
                <span>Continuar agora</span>
              </button>
            </div>
          )}

          <button className={styles.logout} onClick={handleLogout}>
            <span className={styles.iconWrapper}>
              <LogoutIcon />
            </span>
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;