/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./cadastroEmpresa.module.css";
import { supabase } from "supabaseClient";
import cija_logo from "../../../assets/logo2.png";
import EyeClosedIcon from "../../../components/icons/EyeClosedIcon";
import EyeOpenIcon from "../../../components/icons/EyeOpenIcon";
import { useDocumentTitle } from "Hooks/useDocumentTitle";
import {
  validarTelefone,
  validarCNPJ,
  limparCNPJ,
} from "../../../utils/validations/cadastroValidation";
import {
  formatarCNPJ,
  formatarTelefone,
} from "../../../utils/validations/formatter";

import {
  Mail, // Email
  Phone, // Telefone
  User, // CPF/Pessoa
  Building2, // CNPJ/Empresa
  MapPin, // Endereço
  Calendar, // Data
  CheckCircle, // Check verde
  XCircle, // X erro
  AlertCircle, // Aviso
} from "lucide-react";

export default function CadastroEmpresa() {
  const navigate = useNavigate();
  useDocumentTitle("CIJA - Cadastro Empresarial");

  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    senha: "",
    confirmSenha: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalMessage, setGlobalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (globalMessage && !success) {
      const timer = setTimeout(() => setGlobalMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [globalMessage, success]);

  const triggerError = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === "cnpj") finalValue = formatarCNPJ(value);
    if (name === "telefone") finalValue = formatarTelefone(value);
    setForm((prev) => ({ ...prev, [name]: finalValue }));
  };

  const validations = {
    nome: form.nome.trim().length >= 3,
    cnpj: validarCNPJ(form.cnpj),
    telefone: validarTelefone(form.telefone),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    endereco: form.endereco.trim().length >= 5,
    senhaMin: form.senha.length >= 8,
    senhaMaiuscula: /[A-Z]/.test(form.senha),
    senhaNumero: /\d/.test(form.senha),
    confirmSenha: form.senha && form.senha === form.confirmSenha,
  };

  const senhaForte =
    validations.senhaMin &&
    validations.senhaMaiuscula &&
    validations.senhaNumero;

  const getPasswordStrength = () => {
    let score = 0;
    if (validations.senhaMin) score++;
    if (validations.senhaMaiuscula) score++;
    if (validations.senhaNumero) score++;
    if (/[^A-Za-z0-9]/.test(form.senha)) score++;
    return score;
  };

  const strength = getPasswordStrength();
  const strengthLabel = ["", "Fraca", "Média", "Forte", "Muito forte"][
    strength
  ];
  const strengthClass = [
    "",
    styles.weak,
    styles.medium,
    styles.strong,
    styles.veryStrong,
  ][strength];

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!validations.nome)
      newErrors.nome = "Nome deve ter pelo menos 3 caracteres.";
    if (!validations.cnpj) newErrors.cnpj = "CNPJ inválido.";
    if (!validations.telefone) newErrors.telefone = "Telefone inválido.";
    if (!validations.email) newErrors.email = "Email inválido.";
    if (!validations.endereco) newErrors.endereco = "Endereço muito curto.";
    if (!senhaForte)
      newErrors.senha = "Senha deve ter 8+ caracteres, 1 maiúscula e 1 número.";
    if (!validations.confirmSenha)
      newErrors.confirmSenha = "As senhas não coincidem.";
    return newErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalMessage("");
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      triggerError();
      return;
    }

    setLoading(true);
    const emailLower = form.email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailLower,
        password: form.senha,
        options: { data: { tipo_usuario: "empresa" } },
      });

      if (error || !data.user) throw error;

      if (data.user.identities && data.user.identities.length === 0) {
        setGlobalMessage("Não foi possível concluir o cadastro. Tente novamente em alguns minutos.");
        triggerError();
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("empresa").insert([
        {
          id_em: data.user.id,
          nome: form.nome,
          email: emailLower,
          endereco: form.endereco,
          telefone: `+55${form.telefone.replace(/\D/g, "")}`,
          cnpj: limparCNPJ(form.cnpj),
          email_confirmado: false,
        },
      ]);

      if (insertError) {
        await supabase.auth.signOut();
        throw insertError;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/confirmar-email", {
          state: { emailAlvo: emailLower, tipoUsuario: "empresa" },
        });
      }, 2800);
    } catch (err: any) {
      console.error(err);
      setGlobalMessage(err.message || "Erro ao criar conta empresarial.");
      triggerError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      

      {globalMessage && <div className={styles.alert}>{globalMessage}</div>}
      <img src={cija_logo} alt="CIJA" className={styles.desktopLogo} />

      <div className={styles.loginContainer}>
        <div className={styles.left}>
          <span className={styles.badge}>Plataforma Empresarial</span>
          <h1>
            Conecte-se aos <br />
            <span>melhores talentos</span>
          </h1>
          <p className={styles.tagline}>
            Cadastre sua empresa e publique vagas em minutos. Processo validado
            e seguro.
          </p>
        </div>

        <div className={`${styles.loginCard} ${isShaking ? styles.shake : ""}`}>
          {success ? (
            <div className={styles.successAnimation}>
              <div className={styles.successParticles}>
                {[...Array(9)].map((_, i) => (
                  <span key={i}></span>
                ))}
              </div>
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
                  d="M14 27l7 7 17-17"
                />
              </svg>
              <h2>Conta criada!</h2>
              <p>
                Enviamos o código de verificação para seu e-mail corporativo.
              </p>
            </div>
          ) : (
            <div className={styles.cardContent}>
              <img src={cija_logo} alt="CIJA" className={styles.mobileLogo} />
              <h2>Cadastro Empresarial</h2>
              <p className={styles.subtitle}>Preencha os dados abaixo</p>

              <div className={styles.validationBox}>
                <div
                  className={`${styles.validationItem} ${validations.nome ? styles.valid : ""}`}
                >
                  <span className={styles.checkIcon}>✓</span> Nome válido
                </div>
                <div
                  className={`${styles.validationItem} ${validations.cnpj ? styles.valid : ""}`}
                >
                  <span className={styles.checkIcon}>✓</span> CNPJ válido
                </div>
                <div
                  className={`${styles.validationItem} ${senhaForte ? styles.valid : ""}`}
                >
                  <span className={styles.checkIcon}>✓</span> Senha forte
                </div>
                <div
                  className={`${styles.validationItem} ${validations.confirmSenha ? styles.valid : ""}`}
                >
                  <span className={styles.checkIcon}>✓</span> Senhas coincidem
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="nome"
                    placeholder="Nome da empresa"
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
                  <input
                    type="text"
                    name="cnpj"
                    placeholder="CNPJ (00.000.000/0000-00)"
                    value={form.cnpj}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.cnpj ? styles.error : ""}`}
                    maxLength={18}
                  />
                  <Building2 size={45} className={styles.inputIcon} />
                  {errors.cnpj && (
                    <p className={styles.errorMessage}>{errors.cnpj}</p>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    name="telefone"
                    placeholder="Telefone (11) 99999-9999"
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
                  <input
                    type="email"
                    name="email"
                    placeholder="Email empresarial"
                    value={form.email}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.email ? styles.error : ""}`}
                  />
                  <Mail size={45} className={styles.inputIcon} />
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
                          className={`${styles.strengthFill} ${strengthClass}`}
                        ></div>
                      </div>
                      <span>{strengthLabel}</span>
                    </div>
                  )}
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
                  className={styles.actionButton}
                  disabled={loading}
                >
                  {loading ? "Criando conta..." : "Cadastrar Empresa"}
                </button>
              </form>

              <div className={styles.footerActions}>
                <div className={styles.separator}>ou</div>
                <p className={styles.subLink}>
                  Já tem conta?{" "}
                  <a onClick={() => navigate("/loginEmpresa")}>
                    Voltar para login empresarial
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
