import React, { useEffect, useState, useCallback } from "react";
// Import do CSS correto do seu projeto
import styles from "./Sidebar.module.css";
import cijaLogo from "../../assets/logo2.png";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M3 12h18" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 1 0 7.75" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

const DocumentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 19 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const SidebarEmpresa: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState("");
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
      }
    };
    init();
  }, []);

  const carregarNaoLidas = useCallback(async () => {
    if (!userId) return;

    const { count, error } = await supabase
      .from("mensagens")
      .select("*", { count: "exact", head: true })
      .eq("id_em", userId)
      .eq("enviado_por_jovem", true)
      .eq("lida", false);

    if (!error) {
      setNaoLidas(count || 0);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    carregarNaoLidas();

    const channel = supabase
      .channel(`sidebar-empresa-mensagens-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mensagens",
          filter: `id_em=eq.${userId}`,
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
    { label: "Início", path: "/menuEmpresa", icon: <HomeIcon /> },
    { label: "Minhas Vagas", path: "/vagasEmpresa", icon: <BriefcaseIcon /> },
    { label: "Candidatos", path: "/candidatosEmpresa", icon: <UsersIcon /> },
    { label: "Pré-Entrevistas", path: "/preEntrevista", icon: <DocumentIcon /> },
    {
      label: "Mensagens",
      path: "/mensagemEmpresa",
      icon: <MailIcon />,
      badge: naoLidas,
    },
    { label: "Perfil Empresa", path: "/perfilEmpresa", icon: <UserIcon /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.topContent}>
        <div className={styles.logoContainer}>
          <img src={cijaLogo} alt="CIJA" className={styles.logo} />
          <p className={styles.subtitle}>Centro de Integração</p>

        </div>

        <nav className={styles.menu}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`${styles.menuItem} ${
                location.pathname === item.path ? styles.active : ""
              }`}
              onClick={() => navigate(item.path)}
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
        <button className={styles.logout} onClick={handleLogout}>
          <span className={styles.iconWrapper}>
            <LogoutIcon />
          </span>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export { SidebarEmpresa };
export default SidebarEmpresa;