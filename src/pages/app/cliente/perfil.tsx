import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../../../components/sideBar/sideBar";
import { supabase } from "supabaseClient";
import styles from "./perfil.module.css";
import { useDocumentTitle } from "Hooks/useDocumentTitle";

const phone = (v: string) => {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  return d.length === 11
    ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    : v;
};

const cpfMask = (v: string) => {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return v;
};

const calc = (user: any, cv: any) => {
  const hasAvatar = !!(user.avatar || user.avatar_url || user.foto);
  const hasNome = (user.nome || "").trim().length > 3;
  const hasEmail = !!user.email;
  const hasTel = (user.tel || "").replace(/\D/g, "").length >= 10;
  const hasCpf = (user.cpf || "").replace(/\D/g, "").length >= 11;

  const descLen = (cv.descricao || "").trim().length;
  const desc =
    descLen >= 100
      ? 20
      : descLen >= 50
        ? 15
        : descLen >= 20
          ? 8
          : descLen > 0
            ? 3
            : 0;

  const skillsCount = (cv.competencias || "")
    .split(",")
    .filter((s: string) => s.trim()).length;
  const skills = Math.min(skillsCount * 3, 15);

  let formacao = 0;
  try {
    const form = JSON.parse(cv.curso || "[]");
    if (Array.isArray(form) && form.length > 0)
      formacao = form.length >= 2 ? 15 : 10;
  } catch {}

  let experiencia = 0;
  try {
    const exp = JSON.parse(cv.experiencias || "{}");
    const list = exp.experiencias || [];
    experiencia = list.length >= 2 ? 15 : list.length === 1 ? 10 : 0;
  } catch {}

  const percent = Math.min(
    (hasAvatar ? 15 : 0) +
      (hasNome ? 5 : 0) +
      (hasEmail ? 5 : 0) +
      (hasTel ? 5 : 0) +
      (hasCpf ? 5 : 0) +
      desc +
      skills +
      formacao +
      experiencia,
    100,
  );

  return { percent };
};

export default function Perfil() {
  const navigate = useNavigate();
  const { idJa } = useParams<{ idJa?: string }>();
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    nome: "",
    email: "",
    tel: "",
    cpf: "",
    cidade: "São Paulo, Brasil",
    avatar: "",
    titulo: "Jovem Aprendiz",
  });

  const [cv, setCv] = useState({
    desc: "",
    comp: "",
    exp: '{"experiencias":[]}',
    cur: "[]",
    pdfUrl: "",
  });

  const [editingSummary, setEditingSummary] = useState(false);
  const [summary, setSummary] = useState("");

  // Edição de dados pessoais (Nome, Telefone, CPF)
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editTel, setEditTel] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [savingPersonal, setSavingPersonal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [vagasCount, setVagasCount] = useState(0);
  const [candidaturasCount, setCandidaturasCount] = useState(0);
  const [activeTab, setActiveTab] = useState("visao");

  // Inline Form States
  const [showAddFormacao, setShowAddFormacao] = useState(false);
  const [newCurso, setNewCurso] = useState("");
  const [newInstituicao, setNewInstituicao] = useState("");
  const [newInicio, setNewInicio] = useState("");
  const [newFim, setNewFim] = useState("");

  const [showAddCompetencia, setShowAddCompetencia] = useState(false);
  const [newCompetencia, setNewCompetencia] = useState("");

  const [showAddExperiencia, setShowAddExperiencia] = useState(false);
  const [newCargo, setNewCargo] = useState("");
  const [newEmpresa, setNewEmpresa] = useState("");
  const [newExpInicio, setNewExpInicio] = useState("");
  const [newExpFim, setNewExpFim] = useState("");
  const [newExpDesc, setNewExpDesc] = useState("");

  // Password Change States
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // PDF Upload state
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useDocumentTitle("CIJA - Perfil");
  const visualizacaoEmpresa = !!idJa;

  const tabs = [
    { id: "visao", label: "Visão geral" },
    { id: "formacao", label: "Formação" },
    { id: "competencias", label: "Competências" },
    { id: "experiencia", label: "Experiência" },
    { id: "documentos", label: "Currículo" },
  ];

  useEffect(() => {
    init();
  }, [idJa]);

  const init = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user && !idJa) {
      setLoading(false);
      return;
    }
    const perfilId = idJa ?? user?.id ?? null;
    if (!perfilId) {
      setLoading(false);
      return;
    }
    setUid(perfilId);
    await loadProfile(perfilId, user?.email || "");

    const { count: vCount } = await supabase
      .from("vaga")
      .select("id_vag", { count: "exact", head: true });
    setVagasCount(vCount || 0);

    const { count: cCount } = await supabase
      .from("candidaturas")
      .select("*", { count: "exact", head: true })
      .eq("id_ja", perfilId);
    setCandidaturasCount(cCount || 0);
  };

  const loadProfile = async (userId: string, userEmail: string) => {
    try {
      const [p, c] = await Promise.all([
        supabase
          .from("jovem_aprendiz")
          .select("*")
          .eq("id_ja", userId)
          .maybeSingle(),
        supabase
          .from("curriculo_ja")
          .select("*")
          .eq("id_ja", userId)
          .maybeSingle(),
      ]);

      let avatarUrl = "";
      if (p.data) {
        avatarUrl = p.data.avatar_url || p.data.avatar || p.data.foto || "";
        setProfile({
          nome: p.data.nome || "",
          email: p.data.email || userEmail,
          tel: p.data.telefone || "",
          cpf: p.data.cpf || "",
          cidade: p.data.cidade || "São Paulo, Brasil",
          avatar: avatarUrl,
          titulo: "Jovem Aprendiz",
        });
        setEditNome(p.data.nome || "");
        setEditTel(p.data.telefone || "");
        setEditCpf(p.data.cpf || "");
      }

      if (c.data) {
        setCv({
          desc: c.data.descricao || "",
          comp: c.data.competencias || "",
          exp: c.data.experiencias || '{"experiencias":[]}',
          cur: c.data.curso || "[]",
          pdfUrl: c.data.pdf_url || "",
        });
        setSummary(c.data.descricao || "");
      }
    } finally {
      setLoading(false);
    }
  };

  const expList = useMemo(() => {
    try {
      const parsed = JSON.parse(cv.exp);
      return (parsed.experiencias || []).filter(
        (e: any) => e && (e.cargo || e.empresa),
      );
    } catch {
      return [];
    }
  }, [cv.exp]);

  const curList = useMemo(() => {
    try {
      const parsed = JSON.parse(cv.cur);
      return (Array.isArray(parsed) ? parsed : []).filter(
        (c: any) => c && (c.curso || c.instituicao),
      );
    } catch {
      return [];
    }
  }, [cv.cur]);

  const skillsList = useMemo(
    () =>
      cv.comp
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [cv.comp],
  );

  const pct = useMemo(
    () =>
      calc(profile, {
        ...cv,
        descricao: cv.desc,
        competencias: cv.comp,
        curso: cv.cur,
        experiencias: cv.exp,
      }).percent,
    [profile, cv],
  );

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid || visualizacaoEmpresa) return;
    const preview = URL.createObjectURL(file);
    setProfile((p) => ({ ...p, avatar: preview }));
    try {
      const blob = await new Promise<Blob>((res, rej) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = c.height = 400;
          const ctx = c.getContext("2d")!;
          const s = Math.min(img.width, img.height);
          ctx.drawImage(
            img,
            (img.width - s) / 2,
            (img.height - s) / 2,
            s,
            s,
            0,
            0,
            400,
            400,
          );
          c.toBlob((b) => (b ? res(b) : rej()), "image/jpeg", 0.9);
        };
        img.src = URL.createObjectURL(file);
      });
      const path = `${uid}/avatar.jpg`;
      await supabase.storage.from("avatars").remove([path]);
      await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true });
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase
        .from("jovem_aprendiz")
        .update({ avatar_url: data.publicUrl })
        .eq("id_ja", uid);
      setProfile((p) => ({
        ...p,
        avatar: `${data.publicUrl}?v=${Date.now()}`,
      }));
      setAvatarVersion((v) => v + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const savePersonalData = async () => {
    if (!uid) return;
    setSavingPersonal(true);
    const { error } = await supabase
      .from("jovem_aprendiz")
      .update({
        nome: editNome,
        telefone: editTel,
        cpf: editCpf,
      })
      .eq("id_ja", uid);

    if (!error) {
      setProfile((p) => ({
        ...p,
        nome: editNome,
        tel: editTel,
        cpf: editCpf,
      }));
      setEditingPersonal(false);
    }
    setSavingPersonal(false);
  };

  const saveSummary = async () => {
    if (!uid) return;
    setSaving(true);
    await supabase.from("curriculo_ja").upsert(
      {
        id_ja: uid,
        descricao: summary,
        competencias: cv.comp,
        experiencias: cv.exp,
        curso: cv.cur,
        pdf_url: cv.pdfUrl,
      },
      { onConflict: "id_ja" },
    );
    setCv((c) => ({ ...c, desc: summary }));
    setEditingSummary(false);
    setSaving(false);
  };

  const handleAddFormacao = async () => {
    if (!uid || !newCurso || !newInstituicao) return;
    const updated = [
      ...curList,
      {
        curso: newCurso,
        instituicao: newInstituicao,
        inicio: newInicio,
        fim: newFim,
      },
    ];
    const str = JSON.stringify(updated);
    await supabase.from("curriculo_ja").upsert(
      {
        id_ja: uid,
        curso: str,
        competencias: cv.comp,
        experiencias: cv.exp,
        descricao: cv.desc,
        pdf_url: cv.pdfUrl,
      },
      { onConflict: "id_ja" },
    );
    setCv((c) => ({ ...c, cur: str }));
    setNewCurso("");
    setNewInstituicao("");
    setNewInicio("");
    setNewFim("");
    setShowAddFormacao(false);
  };

  const handleAddCompetencia = async () => {
    if (!uid || !newCompetencia.trim()) return;
    const updatedList = [...skillsList, newCompetencia.trim()];
    const str = updatedList.join(", ");
    await supabase.from("curriculo_ja").upsert(
      {
        id_ja: uid,
        competencias: str,
        curso: cv.cur,
        experiencias: cv.exp,
        descricao: cv.desc,
        pdf_url: cv.pdfUrl,
      },
      { onConflict: "id_ja" },
    );
    setCv((c) => ({ ...c, comp: str }));
    setNewCompetencia("");
    setShowAddCompetencia(false);
  };

  const handleAddExperiencia = async () => {
    if (!uid || !newCargo || !newEmpresa) return;
    const updatedExps = [
      ...expList,
      {
        cargo: newCargo,
        empresa: newEmpresa,
        inicio: newExpInicio,
        fim: newExpFim,
        descricao: newExpDesc,
      },
    ];
    const payload = JSON.stringify({ experiencias: updatedExps });
    await supabase.from("curriculo_ja").upsert(
      {
        id_ja: uid,
        experiencias: payload,
        curso: cv.cur,
        competencias: cv.comp,
        descricao: cv.desc,
        pdf_url: cv.pdfUrl,
      },
      { onConflict: "id_ja" },
    );
    setCv((c) => ({ ...c, exp: payload }));
    setNewCargo("");
    setNewEmpresa("");
    setNewExpInicio("");
    setNewExpFim("");
    setNewExpDesc("");
    setShowAddExperiencia(false);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploadingPdf(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Pdf = reader.result as string;
        await supabase.from("curriculo_ja").upsert(
          {
            id_ja: uid,
            pdf_url: base64Pdf,
            curso: cv.cur,
            competencias: cv.comp,
            experiencias: cv.exp,
            descricao: cv.desc,
          },
          { onConflict: "id_ja" },
        );
        setCv((c) => ({ ...c, pdfUrl: base64Pdf }));
        setUploadingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploadingPdf(false);
    }
  };

  const openPdfViewer = () => {
    if (!cv.pdfUrl) return;
    try {
      if (cv.pdfUrl.startsWith("data:")) {
        const arr = cv.pdfUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "application/pdf";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } else {
        window.open(cv.pdfUrl, "_blank");
      }
    } catch (err) {
      console.error(err);
      window.open(cv.pdfUrl, "_blank");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setChangingPassword(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email || profile.email;

      if (!email) {
        setPasswordError("E-mail do usuário não identificado.");
        setChangingPassword(false);
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email,
        password: oldPassword,
      });

      if (signInErr) {
        setPasswordError("Senha anterior incorreta.");
        setChangingPassword(false);
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        setPasswordError(updateErr.message);
      } else {
        if (uid) {
          await supabase
            .from("jovem_aprendiz")
            .update({ senha: newPassword })
            .eq("id_ja", uid);
        }
        setPasswordSuccess("Senha alterada com sucesso!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPasswordError(err.message || "Erro ao alterar senha.");
    } finally {
      setChangingPassword(false);
    }
  };

  const initials =
    profile.nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "JA";

  const avatarSrc = profile.avatar
    ? `${profile.avatar}${profile.avatar.includes("?") ? "&" : "?"}v=${avatarVersion}`
    : "";

  if (loading) {
    return (
      <div className={styles.page}>
        {!visualizacaoEmpresa && <Sidebar />}
        <main className={styles.main}>
          <div className={styles.loading}>Carregando...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {!visualizacaoEmpresa && <Sidebar />}
      <main className={styles.main}>
        <div className={styles.topGrid}>
          <section className={styles.headerCard}>
            <div className={styles.avatarBox}>
              {avatarSrc ? (
                <img src={avatarSrc} alt={profile.nome} />
              ) : (
                <div className={styles.avatarFallback}>{initials}</div>
              )}
              <span className={styles.online} />
              {!visualizacaoEmpresa && (
                <label className={styles.cam}>
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={uploadAvatar}
                  />
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </label>
              )}
            </div>
            <div className={styles.headerInfo}>
              <div className={styles.headerTopRow}>
                <h1>{profile.nome || "Seu Nome"}</h1>
                {!visualizacaoEmpresa && (
                  <button
                    onClick={() => setEditingPersonal(!editingPersonal)}
                    className={styles.editPersonalBtn}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    {editingPersonal ? "Cancelar" : "Editar Dados Pessoais"}
                  </button>
                )}
              </div>
              <span className={styles.badge}>Jovem Aprendiz</span>

              {editingPersonal ? (
                <div className={`${styles.formBox} ${styles.mt10}`}>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    className={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Telefone (WhatsApp)"
                    value={editTel}
                    onChange={(e) => setEditTel(e.target.value)}
                    className={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="CPF (ex: 000.000.000-00)"
                    value={editCpf}
                    onChange={(e) => setEditCpf(e.target.value)}
                    className={styles.input}
                  />
                  <button
                    className={styles.save}
                    onClick={savePersonalData}
                    disabled={savingPersonal}
                  >
                    {savingPersonal ? "Salvando..." : "Salvar Dados Pessoais"}
                  </button>
                </div>
              ) : (
                <p className={styles.bio}>
                  {cv.desc || "Adicione uma descrição sobre você."}
                </p>
              )}

              <div className={styles.contacts}>
                <span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 5L2 7" />
                  </svg>
                  {profile.email}
                </span>
                <span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {phone(profile.tel)}
                </span>
                <span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  CPF: {cpfMask(profile.cpf)}
                </span>
                <span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {profile.cidade}
                </span>
              </div>
            </div>
          </section>

          <section className={styles.numbersCard}>
            <h3>
              {visualizacaoEmpresa
                ? "Perfil do candidato em números"
                : "Seu perfil em números"}
            </h3>
            <svg viewBox="0 0 300 40" className={styles.chart}>
              <path d="M0 20 Q 75 5 150 15 T 300 10" />
            </svg>
            <div className={styles.stats}>
              <div>
                <strong>{pct}%</strong>
                <span>Completo</span>
              </div>
              <div>
                <strong>{vagasCount}</strong>
                <span>Vagas</span>
              </div>
              <div>
                <strong>{candidaturasCount}</strong>
                <span>Candidaturas</span>
              </div>
            </div>
          </section>
        </div>

        <nav className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? styles.active : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={styles.grid}>
          {activeTab === "visao" && (
            <>
              <div className={styles.span2Column}>
                <section className={`${styles.card} ${styles.about}`}>
                  <div className={styles.cardHead}>
                    <h3>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Sobre mim
                    </h3>
                    {!visualizacaoEmpresa && (
                      <button
                        onClick={() => setEditingSummary(!editingSummary)}
                      >
                        {editingSummary ? "Cancelar" : "Editar"}
                      </button>
                    )}
                  </div>
                  {editingSummary ? (
                    <>
                      <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={4}
                        className={styles.textarea}
                        placeholder="Fale sobre você..."
                      />
                      <button
                        className={styles.save}
                        onClick={saveSummary}
                        disabled={saving}
                      >
                        {saving ? "Salvando..." : "Salvar"}
                      </button>
                    </>
                  ) : (
                    <p>{cv.desc || "Nenhuma descrição informada."}</p>
                  )}
                  <div className={styles.tags}>
                    {skillsList.slice(0, 5).map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                </section>

                <section className={`${styles.card} ${styles.formacao}`}>
                  <div className={styles.cardHead}>
                    <h3>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                      Formação acadêmica
                    </h3>
                    {!visualizacaoEmpresa && (
                      <button
                        onClick={() => setShowAddFormacao(!showAddFormacao)}
                      >
                        {showAddFormacao ? "Cancelar" : "+ Adicionar"}
                      </button>
                    )}
                  </div>

                  {showAddFormacao && (
                    <div className={styles.formBox}>
                      <input
                        type="text"
                        placeholder="Nome do curso"
                        value={newCurso}
                        onChange={(e) => setNewCurso(e.target.value)}
                        className={styles.input}
                      />
                      <input
                        type="text"
                        placeholder="Instituição"
                        value={newInstituicao}
                        onChange={(e) => setNewInstituicao(e.target.value)}
                        className={styles.input}
                      />
                      <div className={styles.flexGap10}>
                        <input
                          type="text"
                          placeholder="Início (ex: 2022)"
                          value={newInicio}
                          onChange={(e) => setNewInicio(e.target.value)}
                          className={styles.input}
                        />
                        <input
                          type="text"
                          placeholder="Fim (ex: 2025)"
                          value={newFim}
                          onChange={(e) => setNewFim(e.target.value)}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.formActions}>
                        <button
                          className={styles.save}
                          onClick={handleAddFormacao}
                        >
                          Salvar Formação
                        </button>
                        <button
                          className={styles.cancelBtn}
                          onClick={() => setShowAddFormacao(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {curList.length ? (
                    curList.map((c: any, i: number) => (
                      <div key={i} className={styles.item}>
                        <div className={styles.dot} />
                        <div>
                          <strong>{c.curso}</strong>
                          <p>{c.instituicao}</p>
                          {(c.inicio || c.fim) && (
                            <small>
                              {c.inicio} {c.fim ? `- ${c.fim}` : ""}
                            </small>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.empty}>
                      <p>Nenhuma formação acadêmica cadastrada.</p>
                    </div>
                  )}
                </section>

                <section className={`${styles.card} ${styles.skills}`}>
                  <div className={styles.cardHead}>
                    <h3>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      Competências
                    </h3>
                    {!visualizacaoEmpresa && (
                      <button
                        onClick={() =>
                          setShowAddCompetencia(!showAddCompetencia)
                        }
                      >
                        {showAddCompetencia ? "Cancelar" : "+ Adicionar"}
                      </button>
                    )}
                  </div>

                  {showAddCompetencia && (
                    <div className={styles.formBox}>
                      <input
                        type="text"
                        placeholder="Ex: JavaScript, Pacote Office..."
                        value={newCompetencia}
                        onChange={(e) => setNewCompetencia(e.target.value)}
                        className={styles.input}
                      />
                      <div className={styles.formActions}>
                        <button
                          className={styles.save}
                          onClick={handleAddCompetencia}
                        >
                          Salvar Competência
                        </button>
                        <button
                          className={styles.cancelBtn}
                          onClick={() => setShowAddCompetencia(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={styles.skillsContainer}>
                    {skillsList.length ? (
                      skillsList.map((s) => (
                        <div key={s} className={styles.skillChip}>
                          {s}
                        </div>
                      ))
                    ) : (
                      <p className={styles.textCenter}>
                        Nenhuma competência cadastrada
                      </p>
                    )}
                  </div>
                </section>
              </div>

              {!visualizacaoEmpresa && (
                <section className={`${styles.card} ${styles.acoes}`}>
                  <h3>Ações rápidas</h3>
                  <button onClick={() => navigate("/vagas")}>
                    <span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="2"
                          y="7"
                          width="20"
                          height="14"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                    </span>
                    Ver vagas recomendadas
                  </button>
                  <button onClick={() => navigate("/mensagens")}>
                    <span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </span>
                    Ver mensagens
                  </button>

                  <button
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                  >
                    <span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                    Alterar Senha
                  </button>

                  {showPasswordSection && (
                    <div className={styles.formBox}>
                      <form onSubmit={handleChangePassword}>
                        {passwordError && (
                          <div className={styles.errorText}>
                            {passwordError}
                          </div>
                        )}
                        {passwordSuccess && (
                          <div className={styles.successText}>
                            {passwordSuccess}
                          </div>
                        )}

                        {/* Senha Anterior */}
                        <div className={styles.passwordWrapper}>
                          <input
                            type={showOld ? "text" : "password"}
                            placeholder="Senha anterior"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className={styles.eyeBtn}
                            onClick={() => setShowOld(!showOld)}
                            title={showOld ? "Ocultar senha" : "Ver senha"}
                          >
                            {showOld ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            )}
                          </button>
                        </div>

                        {/* Nova Senha */}
                        <div className={styles.passwordWrapper}>
                          <input
                            type={showNew ? "text" : "password"}
                            placeholder="Nova senha (mín. 6 caracteres)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className={styles.eyeBtn}
                            onClick={() => setShowNew(!showNew)}
                            title={showNew ? "Ocultar senha" : "Ver senha"}
                          >
                            {showNew ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            )}
                          </button>
                        </div>

                        {/* Confirmar Nova Senha */}
                        <div className={styles.passwordWrapper}>
                          <input
                            type={showConfirm ? "text" : "password"}
                            placeholder="Confirmar nova senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className={styles.eyeBtn}
                            onClick={() => setShowConfirm(!showConfirm)}
                            title={showConfirm ? "Ocultar senha" : "Ver senha"}
                          >
                            {showConfirm ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            )}
                          </button>
                        </div>

                        <div className={styles.formActions}>
                          <button
                            type="submit"
                            className={styles.save}
                            disabled={changingPassword}
                          >
                            {changingPassword ? "Salvando..." : "Atualizar"}
                          </button>
                          <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={() => {
                              setShowPasswordSection(false);
                              setPasswordError("");
                              setPasswordSuccess("");
                              setOldPassword("");
                              setNewPassword("");
                              setConfirmPassword("");
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {activeTab === "formacao" && (
            <section
              className={`${styles.card} ${styles.formacao}`}
       
              style={{ gridColumn: "1 / -1" }}
            >
              <div className={styles.cardHead}>
                <h3>Formação acadêmica</h3>
                {!visualizacaoEmpresa && (
                  <button onClick={() => setShowAddFormacao(!showAddFormacao)}>
                    {showAddFormacao ? "Cancelar" : "+ Adicionar"}
                  </button>
                )}
              </div>
              {showAddFormacao && (
                <div className={styles.formBox}>
                  <input
                    type="text"
                    placeholder="Nome do curso"
                    value={newCurso}
                    onChange={(e) => setNewCurso(e.target.value)}
                    className={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Instituição"
                    value={newInstituicao}
                    onChange={(e) => setNewInstituicao(e.target.value)}
                    className={styles.input}
                  />
                  <div className={styles.flexGap10}>
                    <input
                      type="text"
                      placeholder="Início"
                      value={newInicio}
                      onChange={(e) => setNewInicio(e.target.value)}
                      className={styles.input}
                    />
                    <input
                      type="text"
                      placeholder="Fim"
                      value={newFim}
                      onChange={(e) => setNewFim(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formActions}>
                    <button className={styles.save} onClick={handleAddFormacao}>
                      Salvar Formação
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => setShowAddFormacao(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {curList.length ? (
                curList.map((c: any, i: number) => (
                  <div key={i} className={`${styles.item} ${styles.mb14}`}>
                    <div className={styles.dot} />
                    <div>
                      <strong>{c.curso}</strong>
                      <p>{c.instituicao}</p>
                      {(c.inicio || c.fim) && (
                        <small>
                          {c.inicio} {c.fim ? `- ${c.fim}` : ""}
                        </small>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.textCenter}>
                  Nenhuma formação cadastrada.
                </p>
              )}
            </section>
          )}

          {activeTab === "competencias" && (
            <section
              className={`${styles.card} ${styles.skills}`}
              style={{ gridColumn: "1 / -1" }}
            >
              <div className={styles.cardHead}>
                <h3>Competências</h3>
                {!visualizacaoEmpresa && (
                  <button
                    onClick={() => setShowAddCompetencia(!showAddCompetencia)}
                  >
                    {showAddCompetencia ? "Cancelar" : "+ Adicionar"}
                  </button>
                )}
              </div>
              {showAddCompetencia && (
                <div className={styles.formBox}>
                  <input
                    type="text"
                    placeholder="Nova competência"
                    value={newCompetencia}
                    onChange={(e) => setNewCompetencia(e.target.value)}
                    className={styles.input}
                  />
                  <div className={styles.formActions}>
                    <button
                      className={styles.save}
                      onClick={handleAddCompetencia}
                    >
                      Salvar Competência
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => setShowAddCompetencia(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              <div className={styles.skillsContainer}>
                {skillsList.length ? (
                  skillsList.map((s) => (
                    <div key={s} className={styles.skillChip}>
                      {s}
                    </div>
                  ))
                ) : (
                  <p className={styles.textCenter}>
                    Nenhuma competência cadastrada
                  </p>
                )}
              </div>
            </section>
          )}

          {activeTab === "experiencia" && (
            <section className={styles.card} style={{ gridColumn: "1 / -1" }}>
              <div className={styles.cardHead}>
                <h3>Experiência profissional</h3>
                {!visualizacaoEmpresa && (
                  <button
                    onClick={() => setShowAddExperiencia(!showAddExperiencia)}
                  >
                    {showAddExperiencia ? "Cancelar" : "+ Adicionar"}
                  </button>
                )}
              </div>
              {showAddExperiencia && (
                <div className={styles.formBox}>
                  <input
                    type="text"
                    placeholder="Cargo"
                    value={newCargo}
                    onChange={(e) => setNewCargo(e.target.value)}
                    className={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Empresa"
                    value={newEmpresa}
                    onChange={(e) => setNewEmpresa(e.target.value)}
                    className={styles.input}
                  />
                  <div className={styles.flexGap10}>
                    <input
                      type="text"
                      placeholder="Início"
                      value={newExpInicio}
                      onChange={(e) => setNewExpInicio(e.target.value)}
                      className={styles.input}
                    />
                    <input
                      type="text"
                      placeholder="Fim"
                      value={newExpFim}
                      onChange={(e) => setNewExpFim(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  <textarea
                    placeholder="Descrição das atividades"
                    value={newExpDesc}
                    onChange={(e) => setNewExpDesc(e.target.value)}
                    className={styles.textarea}
                  />
                  <div className={styles.formActions}>
                    <button
                      className={styles.save}
                      onClick={handleAddExperiencia}
                    >
                      Salvar Experiência
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => setShowAddExperiencia(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {expList.length ? (
                expList.map((e: any, i: number) => (
                  <div key={i} className={`${styles.item} ${styles.mb14}`}>
                    <div className={styles.dot} />
                    <div>
                      <strong>{e.cargo}</strong>
                      <p>{e.empresa}</p>
                      {(e.inicio || e.fim) && (
                        <small>
                          {e.inicio} {e.fim ? `- ${e.fim}` : ""}
                        </small>
                      )}
                      {e.descricao && (
                        <p className={styles.itemDesc}>{e.descricao}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>
                  <p>Nenhuma experiência profissional cadastrada.</p>
                </div>
              )}
            </section>
          )}

          {activeTab === "documentos" && (
            <section className={styles.card} style={{ gridColumn: "1 / -1" }}>
              <div className={styles.cardHead}>
                <h3>Currículo em PDF</h3>
              </div>
              <div className={styles.empty}>
                {cv.pdfUrl ? (
                  <div>
                    <p>
                      Seu currículo em PDF está cadastrado e visível para
                      empresas.
                    </p>
                    <div className={styles.pdfActions}>
                      <button
                        type="button"
                        onClick={openPdfViewer}
                        className={styles.save}
                      >
                        Visualizar PDF em Nova Aba
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>Nenhum currículo em PDF enviado ainda.</p>
                )}
                {!visualizacaoEmpresa && (
                  <div className={styles.mt10}>
                    <label className={`${styles.save} ${styles.cursorPointer}`}>
                      {uploadingPdf ? "Enviando..." : "Enviar / Atualizar PDF"}
                      <input
                        type="file"
                        hidden
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                      />
                    </label>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {visualizacaoEmpresa && (
          <button className={styles.voltar} onClick={() => navigate(-1)}>
            Voltar
          </button>
        )}
      </main>
    </div>
  );
}
