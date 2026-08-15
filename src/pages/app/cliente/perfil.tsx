import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "../../../components/sideBar/sideBar";
import { supabase } from "supabaseClient";
import styles from "./perfil.module.css";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
import {
  formatarCPF,
  formatarTelefone,
} from "../../../utils/validations/formatter";

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

const validateCpf = (cpf: string) => {
  const cleanCpf = cpf.replace(/\D/g, "");
  if (cleanCpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCpf.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCpf.charAt(10), 10)) return false;

  return true;
};

const validatePhoneBrazil = (phoneStr: string) => {
  let cleanPhone = phoneStr.replace(/\D/g, "");

  // Se o número tiver 12 ou 13 dígitos e começar com 55 (DDI do Brasil), removemos o 55 para validar o DDD e número
  if (
    (cleanPhone.length === 12 || cleanPhone.length === 13) &&
    cleanPhone.startsWith("55")
  ) {
    cleanPhone = cleanPhone.slice(2);
  }

  if (cleanPhone.length !== 10 && cleanPhone.length !== 11) return false;
  const ddd = parseInt(cleanPhone.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (cleanPhone.length === 11 && cleanPhone.charAt(2) !== "9") return false;
  return true;
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

  const params = useParams<{ idJa?: string; id?: string; id_ja?: string }>();
  const paramId = params.idJa || params.id || params.id_ja;

  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    nome: "",
    email: "",
    tel: "",
    cpf: "",
    endereco: "",
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

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editTel, setEditTel] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editCity, setEditCity] = useState("");
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState("");

  const [saving, setSaving] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [vagasCount, setVagasCount] = useState(0);
  const [candidaturasCount, setCandidaturasCount] = useState(0);
  const [activeTab, setActiveTab] = useState("visao");

  // Formação states
  const [showAddFormacao, setShowAddFormacao] = useState(false);
  const [editingFormIndex, setEditingFormIndex] = useState<number | null>(null);
  const [newCurso, setNewCurso] = useState("");
  const [newInstituicao, setNewInstituicao] = useState("");
  const [newInicio, setNewInicio] = useState("");
  const [newFim, setNewFim] = useState("");

  // Competência states
  const [showAddCompetencia, setShowAddCompetencia] = useState(false);
  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(
    null,
  );
  const [newCompetencia, setNewCompetencia] = useState("");

  // Experiência states
  const [showAddExperiencia, setShowAddExperiencia] = useState(false);
  const [editingExpIndex, setEditingExpIndex] = useState<number | null>(null);
  const [newCargo, setNewCargo] = useState("");
  const [newEmpresa, setNewEmpresa] = useState("");
  const [newExpInicio, setNewExpInicio] = useState("");
  const [newExpFim, setNewExpFim] = useState("");
  const [newExpDesc, setNewExpDesc] = useState("");

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

  const [uploadingPdf, setUploadingPdf] = useState(false);

  useDocumentTitle("CIJA - Perfil");

  const visualizacaoEmpresa = !!paramId;

  const tabs = [
    { id: "visao", label: "Visão geral" },
    { id: "formacao", label: "Formação" },
    { id: "competencias", label: "Competências" },
    { id: "experiencia", label: "Experiência" },
    { id: "documentos", label: "Currículo" },
  ];

  useEffect(() => {
    init();
  }, [paramId]);

  const init = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user && !paramId) {
      setLoading(false);
      return;
    }
    const perfilId = paramId ?? user?.id ?? null;
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
          endereco: p.data.endereco || "Não informado.",
          avatar: avatarUrl,
          titulo: "Jovem Aprendiz",
        });
        setEditNome(p.data.nome || "");
        setEditTel(p.data.telefone || "");
        setEditCpf(p.data.cpf || "");
        setEditCity(p.data.endereco || "");
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
      setPersonalError("Erro ao atualizar foto de perfil.");
    }
  };

  const savePersonalData = async () => {
    if (!uid) return;
    setPersonalError("");

    if (!editNome.trim()) {
      setPersonalError("Por favor, preencha o nome completo.");
      return;
    }

    if (!validatePhoneBrazil(editTel)) {
      setPersonalError(
        "Número de telefone inválido. Informe um número válido do Brasil.",
      );
      return;
    }
    if (!editCity) {
      setPersonalError("Cidade invalida, digite uma cidade valida do Brasil.");
      return;
    }
    if (!validateCpf(editCpf)) {
      setPersonalError("CPF inválido. Verifique os dígitos informados.");
      return;
    }

    setSavingPersonal(true);
    const { error } = await supabase
      .from("jovem_aprendiz")
      .update({
        nome: editNome,
        telefone: editTel,
        cpf: editCpf,
        endereco: editCity,
      })
      .eq("id_ja", uid);

    if (error) {
      setPersonalError("Erro ao salvar dados pessoais no banco de dados.");
    } else {
      setProfile((p) => ({
        ...p,
        nome: editNome,
        tel: editTel,
        cpf: editCpf,
        endereco: editCity,
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

  // --- FORMAÇÃO CRUD ---
  const handleSaveFormacao = async () => {
    if (!uid || !newCurso || !newInstituicao) return;
    let updated = [...curList];
    const newFormItem = {
      curso: newCurso,
      instituicao: newInstituicao,
      inicio: newInicio,
      fim: newFim,
    };

    if (editingFormIndex !== null) {
      updated[editingFormIndex] = newFormItem;
    } else {
      updated.push(newFormItem);
    }

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
    resetFormacaoForm();
  };

  const handleEditFormacaoClick = (index: number) => {
    const item = curList[index];
    setNewCurso(item.curso || "");
    setNewInstituicao(item.instituicao || "");
    setNewInicio(item.inicio || "");
    setNewFim(item.fim || "");
    setEditingFormIndex(index);
    setShowAddFormacao(false);
  };

  const handleDeleteFormacao = async (index: number) => {
    if (!uid) return;
    const updated = curList.filter((_, i) => i !== index);
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
    resetFormacaoForm();
  };

  const resetFormacaoForm = () => {
    setNewCurso("");
    setNewInstituicao("");
    setNewInicio("");
    setNewFim("");
    setEditingFormIndex(null);
    setShowAddFormacao(false);
  };

  // --- COMPETÊNCIAS CRUD ---
  const handleSaveCompetencia = async () => {
    if (!uid || !newCompetencia.trim()) return;
    let updatedList = [...skillsList];

    if (editingSkillIndex !== null) {
      updatedList[editingSkillIndex] = newCompetencia.trim();
    } else {
      if (!updatedList.includes(newCompetencia.trim())) {
        updatedList.push(newCompetencia.trim());
      }
    }

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
    resetCompetenciaForm();
  };

  const handleEditCompetenciaClick = (index: number) => {
    setNewCompetencia(skillsList[index]);
    setEditingSkillIndex(index);
    setShowAddCompetencia(false);
  };

  const handleDeleteCompetencia = async (index: number) => {
    if (!uid) return;
    const updatedList = skillsList.filter((_, i) => i !== index);
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
    resetCompetenciaForm();
  };

  const resetCompetenciaForm = () => {
    setNewCompetencia("");
    setEditingSkillIndex(null);
    setShowAddCompetencia(false);
  };

  // --- EXPERIÊNCIA CRUD ---
  const handleSaveExperiencia = async () => {
    if (!uid || !newCargo || !newEmpresa) return;
    let updatedExps = [...expList];
    const newExpObj = {
      cargo: newCargo,
      empresa: newEmpresa,
      inicio: newExpInicio,
      fim: newExpFim,
      descricao: newExpDesc,
    };

    if (editingExpIndex !== null) {
      updatedExps[editingExpIndex] = newExpObj;
    } else {
      updatedExps.push(newExpObj);
    }

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
    resetExperienciaForm();
  };

  const handleEditExperienciaClick = (index: number) => {
    const item = expList[index];
    setNewCargo(item.cargo || "");
    setNewEmpresa(item.empresa || "");
    setNewExpInicio(item.inicio || "");
    setNewExpFim(item.fim || "");
    setNewExpDesc(item.descricao || "");
    setEditingExpIndex(index);
    setShowAddExperiencia(false);
  };

  const handleDeleteExperiencia = async (index: number) => {
    if (!uid) return;
    const updatedExps = expList.filter((_: any, i: number) => i !== index);
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
    resetExperienciaForm();
  };

  const resetExperienciaForm = () => {
    setNewCargo("");
    setNewEmpresa("");
    setNewExpInicio("");
    setNewExpFim("");
    setNewExpDesc("");
    setEditingExpIndex(null);
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

  // Estilzacao do botao de edit
  const softEditBtnStyle: React.CSSProperties = {
    background: "rgba(168, 85, 247, 0.12)",
    color: "#c084fc",
    border: "1px solid rgba(168, 85, 247, 0.3)",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

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
                    stroke="#ffffff"
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
                    onClick={() => {
                      setEditingPersonal(!editingPersonal);
                      setPersonalError("");
                    }}
                    style={softEditBtnStyle}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    {editingPersonal ? "Cancelar" : "Editar perfil"}
                  </button>
                )}
              </div>
              <span className={styles.badge}>Jovem Aprendiz</span>

              {editingPersonal ? (
                <div className={`${styles.formBox} ${styles.mt10}`}>
                  {personalError && (
                    <div
                      style={{
                        color: "#ef4444",
                        fontSize: "13px",
                        fontWeight: "500",
                        marginBottom: "8px",
                      }}
                    >
                      {personalError}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    className={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Telefone (WhatsApp com DDD)"
                    value={editTel}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Limita silenciosamente até 13 dígitos
                      if (val.replace(/\D/g, "").length > 13) return;
                      setEditTel(formatarTelefone(val));
                    }}
                    className={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="CPF (ex: 000.000.000-00)"
                    value={editCpf}
                    onChange={(e) => setEditCpf(formatarCPF(e.target.value))}
                    maxLength={14}
                    className={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Cidade ex: São Paulo"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className={styles.input}
                  />
                  <button
                    className={styles.save}
                    onClick={savePersonalData}
                    disabled={savingPersonal}
                  >
                    {savingPersonal ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              ) : (
                <p className={styles.bio}>
                  {cv.desc || "Adicione uma descrição profissional sobre você."}
                </p>
              )}

              <div className={styles.contacts}>
                <span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
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
                    stroke="#ffffff"
                    strokeWidth="2"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {phone(profile.tel)}
                </span>

                {!visualizacaoEmpresa && (
                  <span>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    CPF: {cpfMask(profile.cpf)}
                  </span>
                )}

                <span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {profile.endereco}
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
                        stroke="#ffffff"
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
                        style={softEditBtnStyle}
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
                        placeholder="Fale sobre suas expectativas profissionais e objetivos..."
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
                        stroke="#ffffff"
                        strokeWidth="2"
                      >
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </svg>
                      Formação acadêmica
                    </h3>
                    {!visualizacaoEmpresa && (
                      <button
                        onClick={() => {
                          if (showAddFormacao) {
                            resetFormacaoForm();
                          } else {
                            setEditingFormIndex(null);
                            setShowAddFormacao(true);
                          }
                        }}
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
                          onClick={handleSaveFormacao}
                        >
                          Adicionar Formação
                        </button>
                        <button
                          className={styles.cancelBtn}
                          onClick={resetFormacaoForm}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {curList.length ? (
                    curList.map((c: any, i: number) => (
                      <div key={i} className={styles.item}>
                        {editingFormIndex === i ? (
                          <div
                            className={styles.formBox}
                            style={{ width: "100%", marginTop: "8px" }}
                          >
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
                              onChange={(e) =>
                                setNewInstituicao(e.target.value)
                              }
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
                            <div
                              className={styles.formActions}
                              style={{
                                display: "flex",
                                gap: "8px",
                                justifyContent: "space-between",
                                width: "100%",
                              }}
                            >
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  className={styles.save}
                                  onClick={handleSaveFormacao}
                                >
                                  Salvar alterações
                                </button>
                                <button
                                  className={styles.cancelBtn}
                                  onClick={resetFormacaoForm}
                                >
                                  Cancelar
                                </button>
                              </div>
                              <button
                                className={styles.cancelBtn}
                                onClick={() => handleDeleteFormacao(i)}
                                style={{
                                  color: "#ef4444",
                                  borderColor: "#ef4444",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Excluir
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "12px",
                                alignItems: "flex-start",
                              }}
                            >
                              <div className={styles.dot} />
                              <div>
                                <strong>{c.curso}</strong>
                                <p>{c.instituicao}</p>
                                {(c.inicio || c.fim) && (
                                  <small
                                    style={{
                                      color: "#c084fc",
                                      fontWeight: "500",
                                    }}
                                  >
                                    {c.inicio} {c.fim ? `- ${c.fim}` : ""}
                                  </small>
                                )}
                              </div>
                            </div>
                            {!visualizacaoEmpresa && (
                              <button
                                onClick={() => handleEditFormacaoClick(i)}
                                style={softEditBtnStyle}
                                title="Editar"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Editar
                              </button>
                            )}
                          </div>
                        )}
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
                        stroke="#ffffff"
                        strokeWidth="2"
                      >
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      Competências
                    </h3>
                    {!visualizacaoEmpresa && (
                      <button
                        onClick={() => {
                          if (showAddCompetencia) {
                            resetCompetenciaForm();
                          } else {
                            setEditingSkillIndex(null);
                            setShowAddCompetencia(true);
                          }
                        }}
                      >
                        {showAddCompetencia ? "Cancelar" : "+ Adicionar"}
                      </button>
                    )}
                  </div>

                  {showAddCompetencia && (
                    <div className={styles.formBox}>
                      <input
                        type="text"
                        placeholder="Ex: JavaScript, Pacote Office, Comunicação..."
                        value={newCompetencia}
                        onChange={(e) => setNewCompetencia(e.target.value)}
                        className={styles.input}
                      />
                      <div className={styles.formActions}>
                        <button
                          className={styles.save}
                          onClick={handleSaveCompetencia}
                        >
                          Adicionar Competência
                        </button>
                        <button
                          className={styles.cancelBtn}
                          onClick={resetCompetenciaForm}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {editingSkillIndex !== null && (
                    <div
                      className={styles.formBox}
                      style={{ marginBottom: "12px" }}
                    >
                      <input
                        type="text"
                        value={newCompetencia}
                        onChange={(e) => setNewCompetencia(e.target.value)}
                        className={styles.input}
                      />
                      <div
                        className={styles.formActions}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                        }}
                      >
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className={styles.save}
                            onClick={handleSaveCompetencia}
                          >
                            Salvar alteração
                          </button>
                          <button
                            className={styles.cancelBtn}
                            onClick={resetCompetenciaForm}
                          >
                            Cancelar
                          </button>
                        </div>
                        <button
                          className={styles.cancelBtn}
                          onClick={() =>
                            handleDeleteCompetencia(editingSkillIndex)
                          }
                          style={{
                            color: "#ef4444",
                            borderColor: "#ef4444",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={styles.skillsContainer}>
                    {skillsList.length ? (
                      skillsList.map((s, idx) => (
                        <div
                          key={s}
                          className={styles.skillChip}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span>{s}</span>
                          {!visualizacaoEmpresa && (
                            <button
                              onClick={() => handleEditCompetenciaClick(idx)}
                              title="Editar"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                color: "#c084fc",
                                display: "flex",
                              }}
                            >
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="2"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className={styles.textCenter}>
                        Nenhuma competência cadastrada.
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
                        stroke="#ffffff"
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
                        stroke="#ffffff"
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
                        stroke="#ffffff"
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

                        <div className={styles.passwordWrapper}>
                          <input
                            type={showOld ? "text" : "password"}
                            placeholder="Senha anterior"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                            className={styles.input}
                          />
                          <button
                            type="button"
                            className={styles.eyeBtn}
                            onClick={() => setShowOld(!showOld)}
                          >
                            {showOld ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                width="18"
                                height="11"
                                stroke="#ffffff"
                                strokeWidth="2"
                              >
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                width="18"
                                height="11"
                                stroke="#ffffff"
                                strokeWidth="2"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            )}
                          </button>
                        </div>

                        <div className={styles.passwordWrapper}>
                          <input
                            type={showNew ? "text" : "password"}
                            placeholder="Nova senha (mín. 6 caracteres)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className={styles.input}
                          />
                          <button
                            type="button"
                            className={styles.eyeBtn}
                            onClick={() => setShowNew(!showNew)}
                          >
                            {showNew ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="2"
                              >
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="2"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            )}
                          </button>
                        </div>

                        <div className={styles.passwordWrapper}>
                          <input
                            type={showConfirm ? "text" : "password"}
                            placeholder="Confirmar nova senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className={styles.input}
                          />
                          <button
                            type="button"
                            className={styles.eyeBtn}
                            onClick={() => setShowConfirm(!showConfirm)}
                          >
                            {showConfirm ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="2"
                              >
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="2"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className={styles.separator}>ou</div>

                        <div className={styles.options}>
                          <a
                            className={styles.forgotLink}
                            onClick={() => navigate("/recuperar-senha")}
                          >
                            Esqueci minha senha
                          </a>
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
                  <button
                    onClick={() => {
                      if (showAddFormacao) resetFormacaoForm();
                      else {
                        setEditingFormIndex(null);
                        setShowAddFormacao(true);
                      }
                    }}
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
                    <button
                      className={styles.save}
                      onClick={handleSaveFormacao}
                    >
                      Adicionar Formação
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={resetFormacaoForm}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {curList.length ? (
                curList.map((c: any, i: number) => (
                  <div key={i} className={`${styles.item} ${styles.mb14}`}>
                    {editingFormIndex === i ? (
                      <div className={styles.formBox} style={{ width: "100%" }}>
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
                        <div
                          className={styles.formActions}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            width: "100%",
                          }}
                        >
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              className={styles.save}
                              onClick={handleSaveFormacao}
                            >
                              Salvar alterações
                            </button>
                            <button
                              className={styles.cancelBtn}
                              onClick={resetFormacaoForm}
                            >
                              Cancelar
                            </button>
                          </div>
                          <button
                            className={styles.cancelBtn}
                            onClick={() => handleDeleteFormacao(i)}
                            style={{
                              color: "#ef4444",
                              borderColor: "#ef4444",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="2"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Excluir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "flex-start",
                          }}
                        >
                          <div className={styles.dot} />
                          <div>
                            <strong>{c.curso}</strong>
                            <p>{c.instituicao}</p>
                            {(c.inicio || c.fim) && (
                              <small
                                style={{ color: "#c084fc", fontWeight: "500" }}
                              >
                                {c.inicio} {c.fim ? `- ${c.fim}` : ""}
                              </small>
                            )}
                          </div>
                        </div>
                        {!visualizacaoEmpresa && (
                          <button
                            onClick={() => handleEditFormacaoClick(i)}
                            style={softEditBtnStyle}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="2"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Editar
                          </button>
                        )}
                      </div>
                    )}
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
                    onClick={() => {
                      if (showAddCompetencia) resetCompetenciaForm();
                      else {
                        setEditingSkillIndex(null);
                        setShowAddCompetencia(true);
                      }
                    }}
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
                      onClick={handleSaveCompetencia}
                    >
                      Adicionar Competência
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={resetCompetenciaForm}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {editingSkillIndex !== null && (
                <div
                  className={styles.formBox}
                  style={{ marginBottom: "16px" }}
                >
                  <input
                    type="text"
                    value={newCompetencia}
                    onChange={(e) => setNewCompetencia(e.target.value)}
                    className={styles.input}
                  />
                  <div
                    className={styles.formActions}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className={styles.save}
                        onClick={handleSaveCompetencia}
                      >
                        Salvar alteração
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={resetCompetenciaForm}
                      >
                        Cancelar
                      </button>
                    </div>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => handleDeleteCompetencia(editingSkillIndex)}
                      style={{
                        color: "#ef4444",
                        borderColor: "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Excluir
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.skillsContainer}>
                {skillsList.length ? (
                  skillsList.map((s, idx) => (
                    <div
                      key={s}
                      className={styles.skillChip}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>{s}</span>
                      {!visualizacaoEmpresa && (
                        <button
                          onClick={() => handleEditCompetenciaClick(idx)}
                          title="Editar"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            color: "#c084fc",
                            display: "flex",
                          }}
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className={styles.textCenter}>
                    Nenhuma competência cadastrada.
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
                    onClick={() => {
                      if (showAddExperiencia) resetExperienciaForm();
                      else {
                        setEditingExpIndex(null);
                        setShowAddExperiencia(true);
                      }
                    }}
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
                      onClick={handleSaveExperiencia}
                    >
                      Adicionar Experiência
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={resetExperienciaForm}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {expList.length ? (
                expList.map((e: any, i: number) => (
                  <div key={i} className={`${styles.item} ${styles.mb14}`}>
                    {editingExpIndex === i ? (
                      <div className={styles.formBox} style={{ width: "100%" }}>
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
                        <div
                          className={styles.formActions}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            width: "100%",
                          }}
                        >
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              className={styles.save}
                              onClick={handleSaveExperiencia}
                            >
                              Salvar alterações
                            </button>
                            <button
                              className={styles.cancelBtn}
                              onClick={resetExperienciaForm}
                            >
                              Cancelar
                            </button>
                          </div>
                          <button
                            className={styles.cancelBtn}
                            onClick={() => handleDeleteExperiencia(i)}
                            style={{
                              color: "#ef4444",
                              borderColor: "#ef4444",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="2"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Excluir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "flex-start",
                          }}
                        >
                          <div className={styles.dot} />
                          <div>
                            <strong>{e.cargo}</strong>
                            <p>{e.empresa}</p>
                            {(e.inicio || e.fim) && (
                              <small
                                style={{ color: "#c084fc", fontWeight: "500" }}
                              >
                                {e.inicio} {e.fim ? `- ${e.fim}` : ""}
                              </small>
                            )}
                            {e.descricao && (
                              <p className={styles.itemDesc}>{e.descricao}</p>
                            )}
                          </div>
                        </div>
                        {!visualizacaoEmpresa && (
                          <button
                            onClick={() => handleEditExperienciaClick(i)}
                            style={softEditBtnStyle}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="2"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Editar
                          </button>
                        )}
                      </div>
                    )}
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
