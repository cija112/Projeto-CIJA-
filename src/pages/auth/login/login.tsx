/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./login.module.css";
import { supabase } from "supabaseClient";
import emailjs from "@emailjs/browser";
import cija_logo from "../../../assets/logo2.png";
import youngmanImage from "../../../assets/youngman.jpg";
import groupMain from "../../../assets/groupMain.png";
import girlMain from "../../../assets/girlMain.png";
import EyeOpenIcon from "../../../components/icons/EyeOpenIcon";
import EyeClosedIcon from "../../../components/icons/EyeClosedIcon";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
import { FaLinkedin, FaInstagram } from "react-icons/fa";
import {
  Mail,
  Sparkles,
  Briefcase,
  TrendingUp,
  Phone,
  MapPin,
  MessageSquare,
  Clock,
  Star,
  Users,
  Lightbulb,
  FileText,
  Heart,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  useDocumentTitle("CIJA - Login Jovem Aprendiz");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarDeMim, setLembrarDeMim] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalNotificacao, setGlobalNotificacao] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");

  // Estados do formulário de contato com EmailJS
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [contactToast, setContactToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (globalNotificacao) {
      const timer = setTimeout(() => setGlobalNotificacao(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [globalNotificacao]);

  useEffect(() => {
    const sections = document.querySelectorAll("section[id]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-84px 0px -40% 0px",
        threshold: 0.2,
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  const triggerErrorAnimation = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
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
    const emailFormatado = email.trim().toLowerCase();
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: emailFormatado,
          password: senha,
        });
      if (authError || !authData.user)
        throw new Error("E-mail ou senha inválidos.");

      const { data: cliente, error: clienteError } = await supabase
        .from("jovem_aprendiz")
        .select("email_confirmado")
        .eq("id_ja", authData.user.id)
        .maybeSingle();
      if (clienteError) throw clienteError;
      if (!cliente) {
        await supabase.auth.signOut();
        throw new Error("E-mail ou senha inválidos.");
      }

      const emailConfirmado =
        cliente.email_confirmado === true ||
        cliente.email_confirmado === "true";
      if (!emailConfirmado) {
        setGlobalNotificacao(
          "E-mail não verificado! Redirecionando para a ativação...",
        );
        setTimeout(
          () =>
            navigate("/confirmar-email", {
              state: {
                emailAlvo: emailFormatado,
                tipoUsuario: "jovem_aprendiz",
              },
            }),
          2500,
        );
        return;
      }
      setLoginSuccess(true);
      setTimeout(() => navigate("/clientDashboard", { replace: true }), 2000);
    } catch (err: any) {
      console.error(err);
      setGlobalNotificacao(err.message || "Erro ao realizar login.");
      triggerErrorAnimation();
    } finally {
      setLoading(false);
    }
  };

  const fazerLoginGoogle = async () => {
    setGlobalNotificacao(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/clientDashboard`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setGlobalNotificacao(err.message || "Erro ao autenticar com o Google.");
      triggerErrorAnimation();
    }
  };

  // Sistema de Envio de E-mail via EmailJS integrado com Alerta Verde/Vermelho
  const handleContactSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contactConsent) {
      setContactToast({
        type: "error",
        text: "Você deve autorizar o tratamento dos dados para enviar a mensagem.",
      });
      return;
    }

    setLoadingEmail(true);
    setContactToast(null);

    try {
      await emailjs.send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID!,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID!,
        {
          nome: contactName,
          email: contactEmail,
          assunto: contactSubject,
          mensagem: contactMessage,
        },
        process.env.REACT_APP_EMAILJS_PUBLIC_KEY!,
      );

      setContactToast({
        type: "success",
        text: "Mensagem enviada com sucesso!",
      });

      setContactName("");
      setContactEmail("");
      setContactSubject("");
      setContactMessage("");
      setContactConsent(false);
    } catch (err: any) {
      console.error(err);
      setContactToast({
        type: "error",
        text: "Não foi possível enviar a mensagem. Tente novamente.",
      });
    } finally {
      setLoadingEmail(false);
      setTimeout(() => {
        setContactToast(null);
      }, 5000);
    }
  };

  const cardClasses = `${styles.loginCard} ${isShaking ? styles.shake : ""}`;

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div
          className={styles.headerLogoContainer}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <img
            src={cija_logo}
            alt="CIJA"
            className={styles.headerLogo}
            loading="eager"
            decoding="async"
          />
        </div>
        <ul className={styles.navMenu}>
          <li>
            <a
              href="#inicio"
              className={`${styles.navLink} ${activeSection === "inicio" ? styles.activeLink : ""}`}
            >
              Início
            </a>
          </li>
          <li>
            <a
              href="#sobre"
              className={`${styles.navLink} ${activeSection === "sobre" ? styles.activeLink : ""}`}
            >
              Sobre nós
            </a>
          </li>
          <li>
            <a
              href="#contato"
              className={`${styles.navLink} ${activeSection === "contato" ? styles.activeLink : ""}`}
            >
              Contato
            </a>
          </li>
        </ul>
        <button
          className={styles.entrarHeaderBtn}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <Users className={styles.entrarIcon} />
          Entrar
        </button>
      </header>

      {globalNotificacao && (
        <div className={styles.alert}>{globalNotificacao}</div>
      )}

      {/* SEÇÃO INÍCIO / HERO & LOGIN */}
      <section className={styles.section} id="inicio">
        <div
          className={styles.bgBoyImage}
          style={{
            backgroundImage: `url(${youngmanImage})`,
          }}
        ></div>
        <div className={styles.bgDecorations}>
          <div className={styles.bgArc1}></div>
          <div className={styles.bgArc2}></div>
        </div>

        <div className={styles.loginContainer}>
          <div className={styles.left}>
            <h1>
              Seu futuro começa com uma <br />
              <span>oportunidade.</span>
            </h1>
            <p className={styles.tagline}>
              A CIJA conecta jovens aprendizes a empresas de destaque,
              potencializando carreiras desde o primeiro passo.
            </p>

            <div className={styles.featuresList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIconBox}>
                  <Sparkles className={styles.featureIcon} />
                </div>
                <div className={styles.featureText}>
                  <h4>Revisão de currículo por IA</h4>
                  <p>
                    Otimize seu currículo com inteligência artificial para
                    destacar suas qualidades.
                  </p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIconBox}>
                  <Briefcase className={styles.featureIcon} />
                </div>
                <div className={styles.featureText}>
                  <h4>Fácil aplicação para vagas</h4>
                  <p>
                    Candidate-se a oportunidades de aprendizagem com poucos
                    cliques.
                  </p>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIconBox}>
                  <TrendingUp className={styles.featureIcon} />
                </div>
                <div className={styles.featureText}>
                  <h4>Conecte-se</h4>
                  <p>
                    Dê o primeiro passo para o seu futuro profissional com
                    empresas parceiras.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card de Login */}
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
                    d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  />
                </svg>
                <h2>Login realizado!</h2>
                <p>Entrando no painel...</p>
              </div>
            ) : (
              <div className={styles.cardContent}>
                <p className={styles.welcomeText}>Boas-vindas!</p>
                <h2>Login</h2>
                <p>Acesse sua conta para continuar.</p>

                <form onSubmit={fazerLogin} noValidate>
                  <div className={styles.inputGroup}>
                    <label>E-mail</label>
                    <input
                      type="email"
                      placeholder="seuemail@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${styles.input} ${errors.email ? styles.error : ""}`}
                    />
                    <Mail className={styles.inputIcon} />
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
                        className={`${styles.input} ${errors.senha ? styles.error : ""}`}
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

                  <div className={styles.optionsRow}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={lembrarDeMim}
                        onChange={(e) => setLembrarDeMim(e.target.checked)}
                      />
                      Lembrar de mim
                    </label>
                    <a
                      className={styles.forgotLink}
                      onClick={() => navigate("/recuperar-senha")}
                    >
                      Esqueci minha senha
                    </a>
                  </div>

                  <button
                    type="submit"
                    className={styles.actionButton}
                    disabled={loading}
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </button>
                </form>

                <div className={styles.separator}>ou</div>

                <button
                  type="button"
                  className={styles.googleButton}
                  onClick={fazerLoginGoogle}
                >
                  <svg className={styles.googleIcon} viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.19v3.15C3.17 21.36 7.24 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.19C.43 8.1 0 9.99 0 12s.43 3.9 1.19 5.42l4.09-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.24 0 3.17 2.64 1.19 6.58l4.09 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  Continuar com Google
                </button>

                <div className={styles.footerActions}>
                  <p className={styles.subLink}>
                    Ainda não tem uma conta?{" "}
                    <a onClick={() => navigate("/cadastro")}>Cadastre-se</a>
                  </p>
                  <p className={styles.subLink}>
                    É uma empresa?{" "}
                    <a onClick={() => navigate("/loginEmpresa")}>
                      Área Empresarial
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SEÇÃO SOBRE NÓS */}
      <section className={styles.aboutSectionFull} id="sobre">
        <div className={styles.aboutContainerInner}>
          <div className={styles.aboutHeroTop}>
            <div className={styles.aboutHeroText}>
              <span className={styles.aboutTag}>SOBRE A CIJA</span>
              <h2 className={styles.aboutMainTitle}>
                Conectamos jovens talentos <br />
                <span>ao futuro</span>
              </h2>
              <p className={styles.aboutMainDesc}>
                A CIJA é uma plataforma inovadora que aproxima jovens aprendizes
                de oportunidades reais em grandes empresas. Unimos tecnologia,
                educação e propósito para transformar carreiras e impulsionar o
                desenvolvimento profissional da nova geração.
              </p>
              <div className={styles.aboutBtnGroup}>
                <a href="#inicio" className={styles.purpleBtn}>
                  Conheça nossa plataforma{" "}
                  <ArrowRight className={styles.btnArrow} />
                </a>
                <a href="#contato" className={styles.chatLinkBtn}>
                  <MessageSquare className={styles.chatIcon} /> Fale com nossa
                  equipe
                </a>
              </div>
            </div>
            <div className={styles.aboutHeroImageWrapper}>
              <img
                src={groupMain}
                alt="Jovens talentos CIJA"
                className={styles.groupMainImg}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          <div className={styles.missionValuesCard}>
            <div className={styles.missionColumn}>
              <span className={styles.cardTag}>NOSSA MISSÃO</span>
              <h3 className={styles.cardHeading}>
                Transformar potencial <br />
                em oportunidade
              </h3>
              <p className={styles.cardText}>
                Acreditamos que o primeiro passo para uma grande carreira é ter
                a oportunidade certa. Nossa missão é abrir portas para jovens
                talentos, conectando-os com empresas que acreditam no poder da
                diversidade e da inclusão.
              </p>
              <a href="#inicio" className={styles.purpleBtnSmall}>
                Saiba mais sobre nossa missão
              </a>

              <div className={styles.missionImageContainer}>
                <img
                  src={girlMain}
                  alt="Estudante no notebook"
                  className={styles.girlMainImg}
                  loading="lazy"
                  decoding="async"
                />
                <div className={styles.excellenceBadge}>
                  <Star className={styles.badgeStar} />
                  <div>
                    <strong>Excelência</strong>
                    <span>em tudo que fazemos</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.valuesColumn}>
              <span className={styles.cardTag}>NOSSOS VALORES</span>

              <div className={styles.valueItem}>
                <div className={styles.valueIconBox}>
                  <Users className={styles.valueIcon} />
                </div>
                <div className={styles.valueContent}>
                  <h4>Inclusão</h4>
                  <p>
                    Acreditamos no potencial de todos os jovens, valorizando a
                    diversidade e promovendo igualdade de oportunidades.
                  </p>
                </div>
              </div>

              <div className={styles.valueItem}>
                <div className={styles.valueIconBox}>
                  <Lightbulb className={styles.valueIcon} />
                </div>
                <div className={styles.valueContent}>
                  <h4>Inovação</h4>
                  <p>
                    Utilizamos tecnologia de ponta para criar soluções que
                    realmente fazem a diferença na vida dos jovens.
                  </p>
                </div>
              </div>

              <div className={styles.valueItem}>
                <div className={styles.valueIconBox}>
                  <FileText className={styles.valueIcon} />
                </div>
                <div className={styles.valueContent}>
                  <h4>Transparência</h4>
                  <p>
                    Mantemos uma comunicação clara e honesta com todos os nossos
                    usuários e parceiros.
                  </p>
                </div>
              </div>

              <div className={styles.valueItem}>
                <div className={styles.valueIconBox}>
                  <Heart className={styles.valueIcon} />
                </div>
                <div className={styles.valueContent}>
                  <h4>Compromisso</h4>
                  <p>
                    Estamos comprometidos com o sucesso dos jovens e com o
                    desenvolvimento do país.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO CONTATE-NOS */}
      <section className={styles.contactSectionFull} id="contato">
        <div className={styles.contactContainerInner}>
          <div className={styles.contactHeaderArea}>
            <h2 className={styles.contactMainTitle}>
              Entre em <span>contato</span> conosco
            </h2>
            <p className={styles.contactMainSubtitle}>
              Estamos aqui para ajudar. Se você tem dúvidas, sugestões ou deseja
              saber mais sobre as oportunidades para Jovem Aprendiz, fale com a
              gente.
            </p>
          </div>

          <div className={styles.contactGridCard}>
            <div className={styles.contactInfoCol}>
              <h3 className={styles.contactColTitle}>Fale com a CIJA</h3>

              <div className={styles.contactInfoItem}>
                <div className={styles.contactIconBox}>
                  <Mail className={styles.contactIcon} />
                </div>
                <div>
                  <strong>E-mail</strong>
                  <p>cijabento@gmail.com</p>
                  <span>Responderemos em tempo</span>
                </div>
              </div>
            </div>

            <div className={styles.contactFormCol}>
              <h3 className={styles.contactColTitle}>Envie sua mensagem</h3>

              {/* Alerta / Toast dinâmico verde (sucesso) ou vermelho (erro) */}
              {contactToast && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    backgroundColor:
                      contactToast.type === "success"
                        ? "rgba(34, 197, 94, 0.15)"
                        : "rgba(239, 68, 68, 0.15)",
                    color:
                      contactToast.type === "success" ? "#22c55e" : "#ef4444",
                    border: `1px solid ${
                      contactToast.type === "success"
                        ? "rgba(34, 197, 94, 0.3)"
                        : "rgba(239, 68, 68, 0.3)"
                    }`,
                  }}
                >
                  <span>{contactToast.type === "success" ? "✓" : "✕"}</span>
                  <span>{contactToast.text}</span>
                </div>
              )}

              <form
                onSubmit={handleContactSubmit}
                className={styles.contactForm}
              >
                <div className={styles.formRow}>
                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                      className={styles.inputContact}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <input
                      type="email"
                      placeholder="E-mail"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                      className={styles.inputContact}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    placeholder="Assunto"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    required
                    className={styles.inputContact}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <textarea
                    placeholder="Mensagem"
                    rows={5}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    className={styles.textareaContact}
                  ></textarea>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabelContact}>
                    <input
                      type="checkbox"
                      checked={contactConsent}
                      onChange={(e) => setContactConsent(e.target.checked)}
                      required
                    />
                    Autorizo o tratamento dos meus dados para fins de contato
                    conforme nossa Política de Privacidade.
                  </label>
                </div>

                <button
                  type="submit"
                  className={styles.actionButton}
                  disabled={loadingEmail}
                >
                  {loadingEmail ? "Enviando..." : "Enviar mensagem"}{" "}
                  <ArrowRight className={styles.btnArrow} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerBrandCol}>
            <img
              src={cija_logo}
              alt="CIJA"
              className={styles.footerLogoImg}
              loading="lazy"
              decoding="async"
            />
            <p className={styles.footerBrandText}>
              Conectamos jovens talentos a oportunidades reais em grandes
              empresas, impulsionando o desenvolvimento profissional da nova
              geração.
            </p>
          </div>

          <div className={styles.footerLinksCol}>
            <h4>Institucional</h4>
            <ul>
              <li>
                <a href="#sobre">Sobre nós</a>
              </li>
              <li>
                <a href="#contato">Entre em contato conosco</a>
              </li>
              <li>
                <a href="#">Login</a>
              </li>
            </ul>
          </div>

          <div className={styles.footerLinksCol}>
            <h4>Atendimento</h4>
            <ul className={styles.atendimentoList}>
              <li>
                <Mail className={styles.footerMiniIcon} /> cijabento@gmail.com
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottomBar}>
          <p>© 2026 CIJA. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
