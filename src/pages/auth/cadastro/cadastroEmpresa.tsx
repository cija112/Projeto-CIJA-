/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./cadastroEmpresa.module.css";
import { supabase } from "supabaseClient";
import cija_logo from "../../../assets/logo2.png";
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
import { Building2, Phone, Mail, MapPin, Eye, EyeOff } from "lucide-react";

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

  const [concordouTermos, setConcordouTermos] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalMessage, setGlobalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (globalMessage && !success) {
      const timer = setTimeout(() => setGlobalMessage(""), 5000);
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

    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const passwordRules = {
    minLength: form.senha.length >= 8,
    upperCase: /[A-Z]/.test(form.senha),
    lowerCase: /[a-z]/.test(form.senha),
    number: /\d/.test(form.senha),
    special: /[!@#$%^&*(),.?":{}|<>\-_]/.test(form.senha),
  };

  const calculatePasswordStrength = () => {
    let score = 0;
    if (passwordRules.minLength) score++;
    if (passwordRules.upperCase) score++;
    if (passwordRules.lowerCase) score++;
    if (passwordRules.number) score++;
    if (passwordRules.special) score++;
    return score;
  };

  const passwordStrength = calculatePasswordStrength();

  const getStrengthLabel = () => {
    if (passwordStrength <= 2) return { text: "Fraca", color: "#ef4444" };
    if (passwordStrength <= 4) return { text: "Média", color: "#f59e0b" };
    return { text: "Forte", color: "#10b981" };
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.nome.trim() || form.nome.trim().length < 3)
      newErrors.nome = "Nome da empresa obrigatório.";
    if (!validarCNPJ(form.cnpj)) newErrors.cnpj = "CNPJ inválido.";
    if (!validarTelefone(form.telefone))
      newErrors.telefone = "Telefone inválido.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "E-mail inválido.";
    if (!form.endereco.trim() || form.endereco.trim().length < 5)
      newErrors.endereco = "Endereço obrigatório.";

    if (passwordStrength < 5)
      newErrors.senha =
        "A senha não atende a todos os requisitos de segurança.";

    if (form.senha !== form.confirmSenha)
      newErrors.confirmSenha = "As senhas não coincidem.";

    if (!concordouTermos)
      newErrors.termos =
        "Você deve aceitar os Termos de Uso e Política de Privacidade.";

    return newErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalMessage("");
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setGlobalMessage("Por favor, corrija os erros destacados no formulário.");
      triggerError();
      return;
    }

    setLoading(true);
    const emailLower = form.email.trim().toLowerCase();
    const cnpjLimpo = limparCNPJ(form.cnpj);

    try {
      const { data: empresaExistente } = await supabase
        .from("empresa")
        .select("email, cnpj")
        .or(`email.eq.${emailLower},cnpj.eq.${cnpjLimpo}`)
        .maybeSingle();

      if (empresaExistente) {
        if (empresaExistente.email === emailLower) {
          throw new Error("Este e-mail já está cadastrado no sistema.");
        } else {
          throw new Error("Este CNPJ já está cadastrado no sistema.");
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email: emailLower,
        password: form.senha,
        options: { data: { tipo_usuario: "empresa", nome: form.nome } },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erro ao criar credenciais de acesso.");

      const { error: insertError } = await supabase.from("empresa").insert([
        {
          id_em: data.user.id,
          nome: form.nome,
          email: emailLower,
          endereco: form.endereco,
          telefone: `+55${form.telefone.replace(/\D/g, "")}`,
          cnpj: cnpjLimpo,
          email_confirmado: false,
          senha: form.senha,
        },
      ]);

      if (insertError) {
        await supabase.auth.signOut();
        throw insertError;
      }

      await supabase.auth.signOut();

      setSuccess(true);

      setTimeout(() => {
        navigate("/confirmar-email", {
          state: { emailAlvo: emailLower, tipoUsuario: "empresa" },
        });
      }, 2200);
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
      {/* Logo limpa sem fundo no topo esquerdo */}
      <div className={styles.topLogo}>
        <img src={cija_logo} alt="CIJA" />
      </div>

      {globalMessage && !success && (
        <div className={styles.alert}>{globalMessage}</div>
      )}

      <div className={styles.container}>
        <div className={styles.leftSection}>
          <h1>
            Comece <br />
            sua jornada <br />
            com o <span className={styles.highlightText}>CIJA!</span>
          </h1>
          <p className={styles.tagline}>
            Cadastre sua empresa gratuitamente e conecte-se aos melhores
            talentos do mercado para impulsionar o seu negócio.
          </p>
        </div>

        <div className={styles.rightSection}>
          <div
            className={`${styles.formCard} ${isShaking ? styles.shake : ""}`}
          >
            {success ? (
              <div className={styles.successAnimationContainer}>
                <svg
                  className={styles.checkmarkSvg}
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
                <h2 className={styles.successTitle}>
                  Conta criada com sucesso!
                </h2>
                <p className={styles.successText}>
                  Redirecionando para confirmação do e-mail...
                </p>
              </div>
            ) : (
              <>
                <div className={styles.formHeader}>
                  <h2>Cadastro da Empresa</h2>
                  <p>
                    Preencha os dados abaixo para registrar sua organização.
                  </p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  <div className={styles.rowGrid}>
                    <div className={styles.inputGroup}>
                      <label>Nome da Empresa</label>
                      <div className={styles.inputWrapper}>
                        <input
                          type="text"
                          name="nome"
                          placeholder="Digite o nome da empresa"
                          value={form.nome}
                          onChange={handleChange}
                          className={`${styles.input} ${errors.nome ? styles.errorBorder : ""}`}
                        />
                        <Building2 size={18} className={styles.inputIcon} />
                      </div>
                      {errors.nome && (
                        <span className={styles.errorMsg}>{errors.nome}</span>
                      )}
                    </div>

                    <div className={styles.inputGroup}>
                      <label>CNPJ</label>
                      <div className={styles.inputWrapper}>
                        <input
                          type="text"
                          name="cnpj"
                          placeholder="00.000.000/0000-00"
                          value={form.cnpj}
                          onChange={handleChange}
                          maxLength={18}
                          className={`${styles.input} ${errors.cnpj ? styles.errorBorder : ""}`}
                        />
                        <Building2 size={18} className={styles.inputIcon} />
                      </div>
                      {errors.cnpj && (
                        <span className={styles.errorMsg}>{errors.cnpj}</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.rowGrid}>
                    <div className={styles.inputGroup}>
                      <label>E-mail Empresarial</label>
                      <div className={styles.inputWrapper}>
                        <input
                          type="email"
                          name="email"
                          placeholder="empresa@email.com"
                          value={form.email}
                          onChange={handleChange}
                          className={`${styles.input} ${errors.email ? styles.errorBorder : ""}`}
                        />
                        <Mail size={18} className={styles.inputIcon} />
                      </div>
                      {errors.email && (
                        <span className={styles.errorMsg}>{errors.email}</span>
                      )}
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Telefone</label>
                      <div className={styles.inputWrapper}>
                        <input
                          type="text"
                          name="telefone"
                          placeholder="(00) 00000-0000"
                          value={form.telefone}
                          onChange={handleChange}
                          className={`${styles.input} ${errors.telefone ? styles.errorBorder : ""}`}
                        />
                        <Phone size={18} className={styles.inputIcon} />
                      </div>
                      {errors.telefone && (
                        <span className={styles.errorMsg}>
                          {errors.telefone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Endereço Completo</label>
                    <div className={styles.inputWrapper}>
                      <input
                        type="text"
                        name="endereco"
                        placeholder="Digite o endereço completo"
                        value={form.endereco}
                        onChange={handleChange}
                        className={`${styles.input} ${errors.endereco ? styles.errorBorder : ""}`}
                      />
                      <MapPin size={18} className={styles.inputIcon} />
                    </div>
                    {errors.endereco && (
                      <span className={styles.errorMsg}>{errors.endereco}</span>
                    )}
                  </div>

                  <div className={styles.rowGrid}>
                    <div className={styles.inputGroup}>
                      <label>Criar Senha</label>
                      <div className={styles.inputWrapper}>
                        <input
                          type={showSenha ? "text" : "password"}
                          name="senha"
                          placeholder="Crie uma senha forte"
                          value={form.senha}
                          onChange={handleChange}
                          className={`${styles.input} ${errors.senha ? styles.errorBorder : ""}`}
                        />
                        <button
                          type="button"
                          className={styles.togglePass}
                          onClick={() => setShowSenha(!showSenha)}
                          title={showSenha ? "Ocultar senha" : "Ver senha"}
                        >
                          {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {form.senha && (
                        <div className={styles.passwordStrengthWrapper}>
                          <div className={styles.strengthBarContainer}>
                            <div
                              className={styles.strengthBarFill}
                              style={{
                                width: `${(passwordStrength / 5) * 100}%`,
                                backgroundColor: getStrengthLabel().color,
                              }}
                            />
                          </div>
                          <span
                            className={styles.strengthText}
                            style={{ color: getStrengthLabel().color }}
                          >
                            Força: {getStrengthLabel().text}
                          </span>
                        </div>
                      )}

                      <span className={styles.helperText}>
                        Mín. 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1
                        especial e sem sequências.
                      </span>
                      {errors.senha && (
                        <span className={styles.errorMsg}>{errors.senha}</span>
                      )}
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Confirmar Senha</label>
                      <div className={styles.inputWrapper}>
                        <input
                          type={showConfirmSenha ? "text" : "password"}
                          name="confirmSenha"
                          placeholder="Confirme sua senha"
                          value={form.confirmSenha}
                          onChange={handleChange}
                          className={`${styles.input} ${errors.confirmSenha ? styles.errorBorder : ""}`}
                        />
                        <button
                          type="button"
                          className={styles.togglePass}
                          onClick={() => setShowConfirmSenha(!showConfirmSenha)}
                          title={
                            showConfirmSenha ? "Ocultar senha" : "Ver senha"
                          }
                        >
                          {showConfirmSenha ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                      {errors.confirmSenha && (
                        <span className={styles.errorMsg}>
                          {errors.confirmSenha}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.termsBox}>
                    <input
                      type="checkbox"
                      id="termos"
                      checked={concordouTermos}
                      onChange={(e) => setConcordouTermos(e.target.checked)}
                    />
                    <label htmlFor="termos">
                      Ao criar sua conta, você concorda com nossos{" "}
                      <a href="#">Termos de Uso</a> e{" "}
                      <a href="#">Política de Privacidade</a>.
                    </label>
                  </div>
                  {errors.termos && (
                    <span className={styles.errorMsg}>{errors.termos}</span>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitBtn}
                  >
                    {loading ? "Cadastrando..." : "Criar Conta"}
                  </button>
                </form>

                <div className={styles.loginFooter}>
                  <p>
                    Já tem conta?{" "}
                    <a onClick={() => navigate("/loginEmpresa")}>Fazer login</a>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
