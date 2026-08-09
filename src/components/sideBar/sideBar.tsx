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

const VagasIcon = () => (
  <svg
    width="200"
    height="200"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <g fill="none" fill-rule="evenodd" clip-rule="evenodd">
      <path
        fill="#0c6fff"
        d="M21.954 10.509a4.08 4.08 0 0 0 1.996-3.064a6 6 0 0 0-.66-3.602a5.5 5.5 0 0 0-2.394-2.375a5 5 0 0 0-3.393-.38a9.3 9.3 0 0 0-2.664 1.048a5.4 5.4 0 0 0-1.487 1.327a5.54 5.54 0 0 0-.848 4.212a4.99 4.99 0 0 0 2.355 3.532a5.05 5.05 0 0 0 2.235.569c1.108.008 2.212-.15 3.273-.47a.27.27 0 0 0 .19-.219q.232.543.519 1.058q.147.251.329.48q.177.233.38.448c.318.34.658.649.997.998a.32.32 0 0 0 .459 0a.32.32 0 0 0 0-.45c-.24-.388-.449-.787-.689-1.167a6 6 0 0 0-.329-.479a4 4 0 0 0-.36-.449c-.229-.249-.468-.469-.708-.698h.12a3.3 3.3 0 0 0 .679-.32m-4.84.568a4.14 4.14 0 0 1-1.876-.559a4.12 4.12 0 0 1-1.796-2.993a4.56 4.56 0 0 1 .758-3.403a4.5 4.5 0 0 1 1.567-1.247a8.8 8.8 0 0 1 1.996-.719a4 4 0 0 1 2.694.25a4.65 4.65 0 0 1 1.996 1.896a5.1 5.1 0 0 1 .678 3.053a3.4 3.4 0 0 1-1.547 2.575a3.2 3.2 0 0 1-.648.3c-1.188.368-1.397 1.047-3.872.847z"
      />
      <path
        fill="#020202"
        d="M19.16 13.722a1.6 1.6 0 0 1-.62.14c-.578.11-1.286.11-2.105.11H14.25c-.798.07-1.527.139-2.076.209v-.4a1.92 1.92 0 0 0-1.307-1.516c-.7-.205-1.454.05-1.886.638c-.297.368-.487.81-.549 1.278s0 .1 0 .15c-.808-.06-2.604-.14-4.201-.32a16 16 0 0 1-1.666-.26a2.2 2.2 0 0 1-.829-.299a2.4 2.4 0 0 1-.788-1.556a14.6 14.6 0 0 1 .05-3.124a.3.3 0 0 0 0-.14c1.297.1 2.584.21 3.892.24h2.444c1.228 0 2.445-.09 3.663-.1a.32.32 0 0 0 .34-.31a.32.32 0 0 0-.36-.338a52 52 0 0 0-3.573-.29H6.317q.082-.659.27-1.297c.053-.259.194-.491.398-.659c.21-.141.449-.236.699-.28a6.5 6.5 0 0 1 .918-.159q.996-.105 1.996-.09a.32.32 0 0 0 .379-.289a.34.34 0 0 0-.3-.36a12.5 12.5 0 0 0-2.514-.239a3.33 3.33 0 0 0-1.826.589a1.9 1.9 0 0 0-.54.998a7 7 0 0 0-.069 1.796H4.371c-1.228.03-2.375.14-3.603.2C.36 8.044 0 11.187 0 11.975c.029.853.387 1.661.998 2.256a4.7 4.7 0 0 0 2.395.728q2.494.126 4.99 0c0 .36.06.719.109.998a.3.3 0 0 0 .31.26a.29.29 0 0 0 .259-.25a5.8 5.8 0 0 1 .11-1.646c.084-.309.245-.59.469-.819a.83.83 0 0 1 .878-.19c.302.108.52.372.569.69c0 .169.05.358.07.548v.17q.045.429 0 .858a2 2 0 0 1-.32.898a1.7 1.7 0 0 1-.569.459a.69.69 0 0 1-.578.09a.36.36 0 0 1-.16-.14c-.06-.1-.11-.21-.16-.31a.33.33 0 0 0-.429-.159a.31.31 0 0 0-.16.43q.09.248.22.478q.132.194.33.32c.304.167.665.203.997.1c.447-.13.85-.379 1.168-.72c.302-.359.51-.787.609-1.247a4.6 4.6 0 0 0 .1-.828c.548 0 1.277.1 2.085.11c.639 0 1.307 0 1.946-.07a8 8 0 0 0 3.323-.788a.33.33 0 0 0 0-.45a.33.33 0 0 0-.4-.03"
      />
      <path
        fill="#020202"
        d="M18.89 15.229a.32.32 0 0 0-.34.309l-.209 4.091q.02.605-.1 1.198a.93.93 0 0 1-.289.519a2.5 2.5 0 0 1-1.118.439q-1.037.15-2.085.16h-2.714c-2.146-.07-4.281-.22-6.427-.23a19 19 0 0 1-2.525 0a2.2 2.2 0 0 1-1.317-.48a.9.9 0 0 1-.23-.508a5.6 5.6 0 0 1 0-1.158v-2.993c0-.41 0-.828.05-1.248a.29.29 0 0 0-.259-.309a.28.28 0 0 0-.31.26c-.049.429-.079.858-.099 1.277c-.05.998-.06 1.996-.12 2.994a8 8 0 0 0 0 1.297c.022.369.166.72.41.998a2.7 2.7 0 0 0 1.347.738a15.6 15.6 0 0 0 3.113.21c2.136 0 4.271.21 6.407.259c.928 0 1.856 0 2.794-.05a14 14 0 0 0 2.225-.25a3.4 3.4 0 0 0 1.517-.688c.27-.272.45-.62.519-.998a6.7 6.7 0 0 0 .08-1.387l.05-4.061a.32.32 0 0 0-.37-.39"
      />
    </g>
  </svg>
);
const PreEntrevistaIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="200"
    height="200"
    viewBox="0 0 24 24"
  >
    <path
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      d="M6.5 9h-1m5 0h-1m-3-3h-1m5 0h-1m9 9h-1m1-4h-1M14 8v14h4c1.886 0 2.828 0 3.414-.586S22 19.886 22 18v-6c0-1.886 0-2.828-.586-3.414S19.886 8 18 8zm0 0c0-2.828 0-4.243-.879-5.121C12.243 2 10.828 2 8 2s-4.243 0-5.121.879C2 3.757 2 5.172 2 8v2m6.025 3.955a2 2 0 1 1-3.999-.002a2 2 0 0 1 3.999.002M2.07 20.21c1.058-1.628 2.739-2.238 3.955-2.237s2.847.609 3.906 2.237c.068.105.087.235.025.344c-.247.439-1.016 1.31-1.57 1.368c-.639.068-2.307.078-2.36.078s-1.773-.01-2.41-.078c-.556-.059-1.324-.929-1.572-1.368a.33.33 0 0 1 .026-.344"
      color="currentColor"
    />
  </svg>
);
const SearchUserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="200"
    height="200"
    viewBox="0 0 24 24"
  >
    <path
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      d="M5.18 15.296c-1.257.738-4.555 2.243-2.547 4.126c.982.92 2.074 1.578 3.448 1.578h7.838c1.374 0 2.467-.658 3.447-1.578c2.009-1.883-1.288-3.389-2.546-4.126c-2.949-1.728-6.69-1.728-9.64 0M14 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0m6.801.8l1.2 1.2m-.6-3.3a2.7 2.7 0 1 0-5.4 0a2.7 2.7 0 0 0 5.4 0"
      color="currentColor"
    />
  </svg>
);
const VagasSearchIcon = () => (
  <svg
    width="200"
    height="200"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd">
      <path d="M21.954 10.509a4.08 4.08 0 0 0 1.995-3.064a6 6 0 0 0-.658-3.602a5.5 5.5 0 0 0-2.395-2.375a5 5 0 0 0-3.393-.38a9.3 9.3 0 0 0-2.664 1.048a5.4 5.4 0 0 0-1.487 1.327a5.54 5.54 0 0 0-.848 4.212a4.99 4.99 0 0 0 2.355 3.532a5.05 5.05 0 0 0 2.235.569c1.108.008 2.212-.15 3.273-.47a.27.27 0 0 0 .19-.219q.232.543.519 1.058q.147.251.329.48a6 6 0 0 0 .38.448c.318.34.658.649.997.998a.32.32 0 0 0 .459 0a.32.32 0 0 0 0-.449c-.24-.39-.45-.788-.688-1.168a6 6 0 0 0-.33-.479a4 4 0 0 0-.36-.449c-.229-.25-.468-.469-.708-.698h.12q.358-.121.679-.32m-4.84.568a4.14 4.14 0 0 1-1.876-.559a4.12 4.12 0 0 1-1.796-2.993a4.56 4.56 0 0 1 .758-3.403a4.5 4.5 0 0 1 1.567-1.247a8.8 8.8 0 0 1 1.996-.719a4 4 0 0 1 2.694.25a4.65 4.65 0 0 1 1.996 1.896a5.1 5.1 0 0 1 .678 3.053a3.4 3.4 0 0 1-1.547 2.575a3.2 3.2 0 0 1-.648.3c-1.188.368-1.397 1.047-3.872.847z" />
      <path d="M19.16 13.722a1.6 1.6 0 0 1-.62.14c-.578.11-1.286.11-2.105.11H14.25c-.798.07-1.527.139-2.076.209v-.4a1.92 1.92 0 0 0-1.307-1.516a1.74 1.74 0 0 0-1.886.638c-.297.368-.487.81-.549 1.278v.15c-.808-.06-2.604-.14-4.2-.32a16 16 0 0 1-1.667-.26a2.2 2.2 0 0 1-.829-.299a2.4 2.4 0 0 1-.788-1.556a14.6 14.6 0 0 1 .05-3.124a.3.3 0 0 0 0-.14c1.297.1 2.584.21 3.892.24h2.445c1.227 0 2.444-.09 3.662-.1a.32.32 0 0 0 .34-.31a.32.32 0 0 0-.36-.338a52 52 0 0 0-3.573-.29H6.317q.082-.659.27-1.297c.053-.259.194-.491.398-.659c.21-.141.449-.236.699-.28q.453-.112.918-.159q.996-.105 1.996-.09a.32.32 0 0 0 .379-.289a.34.34 0 0 0-.3-.36a12.5 12.5 0 0 0-2.514-.239a3.33 3.33 0 0 0-1.826.589a1.9 1.9 0 0 0-.54.998a7 7 0 0 0-.07 1.796H4.372c-1.228.03-2.375.14-3.603.2C.36 8.044 0 11.187 0 11.975c.029.853.387 1.661.998 2.256a4.7 4.7 0 0 0 2.395.728q2.494.126 4.99 0c0 .36.06.719.11.998a.3.3 0 0 0 .308.26a.29.29 0 0 0 .26-.25a5.8 5.8 0 0 1 .11-1.646c.084-.309.245-.59.469-.819a.83.83 0 0 1 .878-.19a.87.87 0 0 1 .569.69c0 .169.05.358.07.548v.17q.045.429 0 .858a2 2 0 0 1-.32.898a1.7 1.7 0 0 1-.569.459a.69.69 0 0 1-.578.09a.36.36 0 0 1-.16-.14c-.06-.1-.11-.21-.16-.31a.33.33 0 0 0-.429-.159a.31.31 0 0 0-.16.43q.09.248.22.478q.132.194.33.32a1.28 1.28 0 0 0 .997.1c.447-.13.85-.379 1.168-.72c.302-.359.51-.787.609-1.247a4.6 4.6 0 0 0 .1-.828c.548 0 1.277.1 2.085.11c.639 0 1.307 0 1.946-.07a8 8 0 0 0 3.323-.788a.33.33 0 0 0 0-.45a.33.33 0 0 0-.4-.03" />
      <path d="M18.89 15.229a.32.32 0 0 0-.34.309l-.209 4.091q.02.605-.1 1.198a.93.93 0 0 1-.289.519a2.5 2.5 0 0 1-1.118.439q-1.037.15-2.085.16h-2.714c-2.146-.07-4.281-.22-6.427-.23a19 19 0 0 1-2.525 0a2.2 2.2 0 0 1-1.317-.48a.9.9 0 0 1-.23-.508a5.6 5.6 0 0 1 0-1.158v-2.993c0-.41 0-.828.05-1.248a.29.29 0 0 0-.469-.245a.28.28 0 0 0-.1.196c-.05.429-.079.858-.099 1.277c-.05.998-.06 1.996-.12 2.994a8 8 0 0 0 0 1.297c.022.369.166.72.41.998a2.7 2.7 0 0 0 1.347.738a15.6 15.6 0 0 0 3.113.21c2.136 0 4.271.21 6.406.26c.929 0 1.857 0 2.795-.05a14 14 0 0 0 2.225-.25a3.4 3.4 0 0 0 1.517-.689c.27-.272.45-.62.519-.998q.11-.689.08-1.387l.05-4.061a.32.32 0 0 0-.213-.38a.3.3 0 0 0-.157-.01" />
    </g>
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
  const [percent, setPercent] = useState<number | null>(null); // Começa como null para evitar flicker na renderização

  useEffect(() => {
    document.body.classList.toggle(
      styles.sidebarOpenBody,
      isOpen && window.innerWidth <= 992,
    );
  }, [isOpen]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const currentUserId = data.user.id;
      setUserId(currentUserId);

      // Buscas paralelas para otimizar a velocidade de carregamento
      const [{ data: ja }, { data: curr }] = await Promise.all([
        supabase
          .from("jovem_aprendiz")
          .select("*")
          .eq("id_ja", currentUserId)
          .maybeSingle(),
        supabase
          .from("curriculo_ja")
          .select("*")
          .eq("id_ja", currentUserId)
          .maybeSingle(),
      ]);

      let pts = 0;
      if (ja?.avatar_url || ja?.avatar || ja?.foto) pts += 15;
      if ((ja?.nome || "").trim().length > 3) pts += 5;
      if (ja?.email) pts += 5;
      if ((ja?.telefone || "").replace(/\D/g, "").length >= 10) pts += 5;
      if ((ja?.cpf || "").replace(/\D/g, "").length >= 11) pts += 5;

      const desc = (curr?.descricao || "").trim().length;
      if (desc >= 100) pts += 20;
      else if (desc >= 50) pts += 15;
      else if (desc >= 20) pts += 8;
      else if (desc > 0) pts += 3;

      const skills = (curr?.competencias || "")
        .split(",")
        .filter((s: string) => s.trim()).length;
      pts += Math.min(skills * 3, 15);

      try {
        const f = JSON.parse(curr?.curso || "[]");
        if (Array.isArray(f) && f.length) pts += f.length >= 2 ? 15 : 10;
      } catch {}

      try {
        const e = JSON.parse(curr?.experiencias || "{}").experiencias || [];
        pts += e.length >= 2 ? 15 : e.length === 1 ? 10 : 0;
      } catch {}

      const calculatedPercent = Math.min(pts, 100);
      setPercent(calculatedPercent);
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, carregarNaoLidas]);

  // Tolerância para >= 98 para evitar que o usuário fique travado por detalhes visuais insignificantes,
  // ou use estritamente percent >= 100 se preferir rigidez absoluta usamos >= 98 para fluidez sem bugs.
  const isProfileComplete = percent !== null && percent >= 98;

  const menuItems: MenuItem[] = [
    { label: "Dashboard", path: "/clientDashboard", icon: <HomeIcon /> },
    ...(isProfileComplete
      ? [
          { label: "Vagas", path: "/vagas", icon: <VagasSearchIcon /> },
          {
            label: "Pré-Entrevistas",
            path: "/preEntrevista",
            icon: <PreEntrevistaIcon />,
          },
          {
            label: "Buscar Usuários",
            path: "/buscarUsers",
            icon: <SearchUserIcon />,
          },
        ]
      : []),
    {
      label: "Candidaturas",
      path: "/candidaturas",
      icon: <ClipboardCheckIcon />,
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
          {percent !== null && percent < 98 && (
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
                onClick={() => handleNavigation("/perfil")}
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
