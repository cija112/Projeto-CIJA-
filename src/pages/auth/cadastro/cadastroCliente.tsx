/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./cadastroCliente.module.css";
import { supabase } from "supabaseClient";
import cija_logo from "../../../assets/logo2.png";
import EyeClosedIcon from "../../../components/icons/EyeClosedIcon";
import EyeOpenIcon from "../../../components/icons/EyeOpenIcon";
import {
  validarCPF,
  validarIdade,
  validarTelefone,
  limparCPF,
} from "../../../utils/validations/cadastroValidation";
import {
  formatarCPF,
  formatarTelefone,
} from "../../../utils/validations/formatter";

import {
  Mail, // Email
  Phone, // Telefone
  User, // CPF/Pessoa
  MapPin, // Endereço
  Calendar, // Data
  ShieldUser, // shield user
} from "lucide-react";

const errorMessages: { [key: string]: string } = {
  nome: "Digite seu nome completo.",
  cpf: "CPF inválido.",
  data_nasc: "Você precisa ter pelo menos 18 anos.",
  telefone: "Telefone inválido.",
  email: "E-mail inválido.",
  endereco: "Digite seu endereço.",
  senha: "Senha inválida.",
  confirmSenha: "As senhas não coincidem.",
};

function AnimatedCheckIcon() {
  return (
    <svg
      className={styles.animatedCheck}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M5 13L9 17L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ValidationItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div
      className={`${styles.validationItem} ${valid ? styles.valid : styles.invalid}`}
    >
      <div className={styles.validationIcon}>
        {valid ? (
          <AnimatedCheckIcon />
        ) : (
          <span className={styles.validationDot} />
        )}
      </div>
      <span>{text}</span>
    </div>
  );
}

export default function CadastroCliente() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    data_nasc: "",
    telefone: "",
    email: "",
    senha: "",
    confirmSenha: "",
    endereco: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalMessage, setGlobalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
  const [dateInputType, setDateInputType] = useState("text");

  const hasSequence = (text: string) =>
    ["123456", "abcdef", "654321", "qwerty"].some((seq) =>
      text.toLowerCase().includes(seq),
    );
  const cpfValido = validarCPF(form.cpf);
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const passwordRules = {
    minLength: form.senha.length >= 8,
    upperCase: /[A-Z]/.test(form.senha),
    lowerCase: /[a-z]/.test(form.senha),
    number: /\d/.test(form.senha),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(form.senha),
    noSequence: form.senha.length > 0 ? !hasSequence(form.senha) : false,
  };
  const strengthScore = Object.values(passwordRules).filter(Boolean).length;
  const strengthPercent = (strengthScore / 6) * 100;
  const strengthMap = ["", "weak", "weak", "medium", "strong", "veryStrong"];
  const strengthTextMap = [
    "",
    "Muito fraca",
    "Fraca",
    "Média",
    "Forte",
    "Muito forte",
    "Excelente",
  ];
  const strengthLevel = strengthMap[strengthScore];
  const strengthText = strengthTextMap[strengthScore];

  useEffect(() => {
    if (globalMessage && !success) {
      const t = setTimeout(() => setGlobalMessage(""), 4500);
      return () => clearTimeout(t);
    }
  }, [globalMessage, success]);
  const triggerError = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let v = value;
    if (name === "cpf") v = formatarCPF(value);
    if (name === "telefone") v = formatarTelefone(value);
    setForm((p) => ({ ...p, [name]: v }));
    if (errors[name]) {
      const u = { ...errors };
      delete u[name];
      setErrors(u);
    }
  };
  const validate = () => {
    const n: { [k: string]: string } = {};
    if (!form.nome.trim() || form.nome.trim().split(" ").length < 2)
      n.nome = errorMessages.nome;
    if (!cpfValido) n.cpf = errorMessages.cpf;
    if (!validarIdade(form.data_nasc)) n.data_nasc = errorMessages.data_nasc;
    if (!validarTelefone(form.telefone)) n.telefone = errorMessages.telefone;
    if (!emailValido) n.email = errorMessages.email;
    if (!form.endereco.trim()) n.endereco = errorMessages.endereco;
    if (!Object.values(passwordRules).every(Boolean))
      n.senha = errorMessages.senha;
    if (form.senha !== form.confirmSenha)
      n.confirmSenha = errorMessages.confirmSenha;
    return n;
  };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalMessage("");
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) {
      triggerError();
      return;
    }
    setLoading(true);
    const emailLower = form.email.trim().toLowerCase();
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailLower,
        password: form.senha,
        options: { data: { nome: form.nome, tipo_usuario: "jovem_aprendiz" } },
      });
      if (authError || !authData?.user)
        throw authError || new Error("Erro ao criar conta.");
      if (authData.user.identities && authData.user.identities.length === 0) {
        setGlobalMessage(
          "Não foi possível concluir o cadastro. Tente novamente em alguns minutos.",
        );
        triggerError();
        setLoading(false);
        return;
      }
      const { confirmSenha, ...toSend } = form;
      const { error: insErr } = await supabase.from("jovem_aprendiz").insert([
        {
          id_ja: authData.user.id,
          ...toSend,
          email: emailLower,
          telefone: `+55${form.telefone.replace(/\D/g, "")}`,
          cpf: limparCPF(form.cpf),
          email_confirmado: false,
        },
      ]);
      if (insErr) {
        await supabase.auth.signOut();
        throw insErr;
      }
      setSuccess(true);
      setGlobalMessage("Conta pré-registrada! Código enviado ao e-mail.");
      setTimeout(
        () =>
          navigate("/confirmar-email", {
            state: { emailAlvo: emailLower, tipoUsuario: "jovem_aprendiz" },
          }),
        3000,
      );
    } catch (err: any) {
      setGlobalMessage(
        err?.message?.includes("rate limit")
          ? "Muitos envios. Aguarde alguns minutos."
          : err.message || "Erro ao realizar cadastro.",
      );
      triggerError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <img src={cija_logo} alt="Logo" className={styles.desktopLogo} />
      {globalMessage && <div className={styles.alert}>{globalMessage}</div>}
      <div className={styles.loginContainer}>
        <div className={styles.left}>
          <img src={cija_logo} alt="Logo" className={styles.mobileLogo} />
          <h1>
            <span className={styles.titleTop}>Crie sua conta</span>{" "}
            <span className={styles.titleBottom}>
              e comece <span className={styles.titleHighlight}>agora</span>
              <span className={styles.titleExclamation}>!</span>
            </span>
          </h1>
          <p className={styles.tagline}>
            Cadastre-se para acessar oportunidades, vagas e recursos exclusivos
            da plataforma.
          </p>
        </div>
        <div className={`${styles.loginCard} ${isShaking ? styles.shake : ""}`}>
          {success ? (
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
              <h2>Código de confirmação Enviado!</h2>
              <p>
                Aguarde 3 segundos, estamos te redirecionando para a tela de
                validação...
              </p>
            </div>
          ) : (
            <div className={styles.cardContent}>
              <h2>Cadastro</h2>
              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="nome"
                    placeholder="Nome completo"
                    value={form.nome}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.nome ? styles.error : ""}`}
                  />
                  <User size={45} className={styles.inputIcon} />
                  {errors.nome && (
                    <p className={styles.errorMessage}>{errors.nome}</p>
                  )}
                </div>
                <div className={styles.inputGroup}>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      name="cpf"
                      placeholder="CPF"
                      value={form.cpf}
                      onChange={handleChange}
                      className={`${styles.input} ${errors.cpf ? styles.error : ""}`}
                    />
                    <ShieldUser size={45} className={styles.inputIcon} />

                    {cpfValido && (
                      <div className={styles.inputCheckWrapper}>
                        <AnimatedCheckIcon />
                      </div>
                    )}
                  </div>
                  {errors.cpf && (
                    <p className={styles.errorMessage}>{errors.cpf}</p>
                  )}
                </div>
                <div className={styles.inputGroup}>
                  <input
                    type={dateInputType}
                    name="data_nasc"
                    placeholder="Data de nascimento"
                    value={form.data_nasc}
                    onChange={handleChange}
                    onFocus={() => setDateInputType("date")}
                    onBlur={(e) => !e.target.value && setDateInputType("text")}
                    className={`${styles.input} ${styles.dateInput} ${errors.data_nasc ? styles.error : ""}`}
                  />
                  <Calendar size={45} className={styles.inputIcon} />

                  {errors.data_nasc && (
                    <p className={styles.errorMessage}>{errors.data_nasc}</p>
                  )}
                </div>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="telefone"
                    placeholder="Telefone"
                    value={form.telefone}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.telefone ? styles.error : ""}`}
                  />
                  <Phone size={45} className={styles.inputIcon} />
                  {errors.telefone && (
                    <p className={styles.errorMessage}>{errors.telefone}</p>
                  )}
                </div>
                <div className={styles.inputGroup}>
                  <div className={styles.inputWrapper}>
                    <input
                      type="email"
                      name="email"
                      placeholder="E-mail"
                      value={form.email}
                      onChange={handleChange}
                      className={`${styles.input} ${errors.email ? styles.error : ""}`}
                    />
                    <Mail size={45} className={styles.inputIcon} />
                    {emailValido && (
                      <div className={styles.inputCheckWrapper}>
                        <AnimatedCheckIcon />
                      </div>
                    )}
                  </div>
                  {errors.email && (
                    <p className={styles.errorMessage}>{errors.email}</p>
                  )}
                </div>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="endereco"
                    placeholder="Endereço completo"
                    value={form.endereco}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.endereco ? styles.error : ""}`}
                  />
                  <MapPin size={45} className={styles.inputIcon} />
                  {errors.endereco && (
                    <p className={styles.errorMessage}>{errors.endereco}</p>
                  )}
                </div>
                <div className={styles.inputGroup}>
                  <div className={styles.senhaBox}>
                    <input
                      type={showSenha ? "text" : "password"}
                      name="senha"
                      placeholder="Senha"
                      value={form.senha}
                      onChange={handleChange}
                      className={`${styles.input} ${errors.senha ? styles.error : ""}`}
                    />
                    <button
                      type="button"
                      className={styles.toggleSenha}
                      onClick={() => setShowSenha(!showSenha)}
                    >
                      {showSenha ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </button>
                  </div>
                  {form.senha && (
                    <div className={styles.passwordStrength}>
                      <div className={styles.strengthBar}>
                        <div
                          className={`${styles.strengthFill} ${strengthLevel ? styles[strengthLevel] : ""}`}
                          style={{ width: `${strengthPercent}%` }}
                        />
                      </div>
                      <span className={styles.strengthLabel}>
                        {strengthText}
                      </span>
                    </div>
                  )}
                  <div className={styles.passwordValidation}>
                    <ValidationItem
                      valid={passwordRules.minLength}
                      text="8 caracteres"
                    />
                    <ValidationItem
                      valid={passwordRules.upperCase}
                      text="Letra maiúscula"
                    />
                    <ValidationItem
                      valid={passwordRules.lowerCase}
                      text="Letra minúscula"
                    />
                    <ValidationItem
                      valid={passwordRules.number}
                      text="Possuí Número"
                    />
                    <ValidationItem
                      valid={passwordRules.special}
                      text="Caractere especial"
                    />
                    <ValidationItem
                      valid={passwordRules.noSequence}
                      text="Sem sequências"
                    />
                  </div>
                  {errors.senha && (
                    <p className={styles.errorMessage}>{errors.senha}</p>
                  )}
                </div>
                <div className={styles.inputGroup}>
                  <div className={styles.senhaBox}>
                    <input
                      type={showConfirmSenha ? "text" : "password"}
                      name="confirmSenha"
                      placeholder="Confirmar senha"
                      value={form.confirmSenha}
                      onChange={handleChange}
                      className={`${styles.input} ${errors.confirmSenha ? styles.error : ""}`}
                    />
                    <button
                      type="button"
                      className={styles.toggleSenha}
                      onClick={() => setShowConfirmSenha(!showConfirmSenha)}
                    >
                      {showConfirmSenha ? <EyeOpenIcon /> : <EyeClosedIcon />}
                    </button>
                  </div>
                  {errors.confirmSenha && (
                    <p className={styles.errorMessage}>{errors.confirmSenha}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.actionButton}
                >
                  {loading ? "Cadastrando..." : "Criar conta"}
                </button>
              </form>
              <div className={styles.footerActions}>
                <div className={styles.separator}>ou</div>
                <p className={styles.subLink}>
                  Já possui conta?{" "}
                  <a onClick={() => navigate("/")}>Fazer login</a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
