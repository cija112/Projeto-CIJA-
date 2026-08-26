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
  Mail,
  Phone,
  User,
  MapPin,
  Calendar,
  ShieldUser,
  Briefcase,
  GraduationCap,
  Users,
  Lock,
} from "lucide-react";

const errorMessages: { [key: string]: string } = {
  nome: "Digite seu nome completo (nome e sobrenome).",
  cpf: "CPF inválido. Verifique os números digitados.",
  data_nasc: "Você precisa ter pelo menos 18 anos.",
  telefone: "Telefone inválido. Use o formato com DDD.",
  email: "E-mail inválido. Insira um endereço correto.",
  endereco: "Digite seu endereço completo.",
  confirmSenha: "As senhas digitadas não coincidem.",
  termos: "Você deve aceitar os Termos de Uso para continuar.",
};

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
  const [concordouTermos, setConcordouTermos] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalMessage, setGlobalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
  const [dateInputType, setDateInputType] = useState("text");

  // Trava para maiores de 18 anos
  const hoje = new Date();
  const anoMax = hoje.getFullYear() - 18;
  const mesMax = String(hoje.getMonth() + 1).padStart(2, "0");
  const diaMax = String(hoje.getDate()).padStart(2, "0");
  const maxDate = `${anoMax}-${mesMax}-${diaMax}`;

  const cpfValido = validarCPF(form.cpf);
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);

  // Validação estrita da senha
  const passwordRules = {
    minLength: form.senha.length >= 6,
    upperCase: /[A-Z]/.test(form.senha),
    lowerCase: /[a-z]/.test(form.senha),
    number: /\d/.test(form.senha),
    special: /[!@#$%^&*(),.?":{}|<>\-_]/.test(form.senha),
    noRepeat: !/(.)\1/.test(form.senha),
  };

  const getSenhaErro = () => {
    if (!form.senha) return "A senha é obrigatória.";
    if (!passwordRules.minLength)
      return "A senha deve ter no mínimo 6 dígitos.";
    if (!passwordRules.upperCase)
      return "A senha deve conter pelo menos 1 letra maiúscula.";
    if (!passwordRules.lowerCase)
      return "A senha deve conter pelo menos 1 letra minúscula.";
    if (!passwordRules.number)
      return "A senha deve conter pelo menos 1 número.";
    if (!passwordRules.special)
      return "A senha deve conter pelo menos 1 símbolo especial.";
    if (!passwordRules.noRepeat)
      return "A senha não deve conter letras ou números repetidos consecutivos.";
    return "";
  };

  const passwordScore = Object.values(passwordRules).filter(Boolean).length;

  const getStrengthLabel = () => {
    if (form.senha.length === 0) return "";
    if (passwordScore <= 3) return "Fraca";
    if (passwordScore <= 5) return "Média";
    return "Forte";
  };

  const getStrengthColor = (index: number) => {
    if (index >= passwordScore) return "#e5e7eb";
    if (passwordScore <= 3) return "#ef4444";
    if (passwordScore <= 5) return "#f59e0b";
    return "#10b981";
  };

  useEffect(() => {
    if (globalMessage && !success) {
      const t = setTimeout(() => setGlobalMessage(""), 7000);
      return () => clearTimeout(t);
    }
  }, [globalMessage, success]);

  const triggerError = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let v = value;
    if (name === "cpf") v = formatarCPF(value);
    if (name === "telefone") v = formatarTelefone(value);

    setForm((p) => {
      const updated = { ...p, [name]: v };
      return updated;
    });

    if (errors[name]) {
      const u = { ...errors };
      delete u[name];
      setErrors(u);
    }
  };

  const validate = () => {
    const n: { [k: string]: string } = {};

    if (!form.nome.trim() || form.nome.trim().split(" ").length < 2) {
      n.nome = errorMessages.nome;
    }
    if (!cpfValido) {
      n.cpf = errorMessages.cpf;
    }
    if (!validarIdade(form.data_nasc)) {
      n.data_nasc = errorMessages.data_nasc;
    }
    if (!validarTelefone(form.telefone)) {
      n.telefone = errorMessages.telefone;
    }
    if (!emailValido) {
      n.email = errorMessages.email;
    }
    if (!form.endereco.trim()) {
      n.endereco = errorMessages.endereco;
    }

    const senhaErroMsg = getSenhaErro();
    if (senhaErroMsg) {
      n.senha = senhaErroMsg;
    }

    if (form.senha !== form.confirmSenha) {
      n.confirmSenha = errorMessages.confirmSenha;
    }
    if (!concordouTermos) {
      n.termos = errorMessages.termos;
    }

    return n;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalMessage("");

    const v = validate();
    setErrors(v);

    if (Object.keys(v).length > 0) {
      setGlobalMessage("Por favor, corrija os erros destacados no formulário.");
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

      if (authError || !authData?.user) {
        throw (
          authError || new Error("Erro desconhecido ao autenticar usuário.")
        );
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
      setGlobalMessage(
        "Conta pré-registrada com sucesso! Código enviado ao e-mail.",
      );

      setTimeout(
        () =>
          navigate("/confirmar-email", {
            state: { emailAlvo: emailLower, tipoUsuario: "jovem_aprendiz" },
          }),
        3000,
      );
    } catch (err: any) {
      let mensagemAmigavel =
        "Ocorreu um erro ao realizar o cadastro. Tente novamente.";

      if (
        err?.name === "AuthRetryableFetchError" ||
        String(err?.message) === "{}" ||
        err?.message === "Failed+to+fetch"
      ) {
        mensagemAmigavel =
          "Erro de conexão com o Supabase. Verifique se suas chaves e o projeto estão ativos.";
      } else if (
        err?.message &&
        typeof err.message === "string" &&
        err.message !== "{}"
      ) {
        mensagemAmigavel = err.message;
      } else if (err?.error_description) {
        mensagemAmigavel = err.error_description;
      }

      setGlobalMessage(mensagemAmigavel);
      triggerError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <img src={cija_logo} alt="Logo CIJA" className={styles.desktopLogo} />

      <div className={styles.topRightLogin}>
        Já possui conta? <a onClick={() => navigate("/")}>Fazer login</a>
      </div>

      {globalMessage && <div className={styles.alert}>{globalMessage}</div>}

      <div className={styles.container}>
        {/* Painel Esquerdo */}
        <div className={styles.leftSection}>
          <img src={cija_logo} alt="Logo CIJA" className={styles.mobileLogo} />
          <h1>
            <span>Comece sua jornada</span>
            <span>
              com o <span className={styles.highlightText}>CIJA!</span>
            </span>
          </h1>
          <p className={styles.tagline}>
            Cadastre-se gratuitamente e tenha acesso a oportunidades exclusivas,
            vagas e conteúdos que vão impulsionar sua carreira.
          </p>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <Briefcase size={22} />
              </div>
              <div>
                <h3>Oportunidades exclusivas</h3>
                <p>
                  Acesso a vagas e processos seletivos de empresas parceiras.
                </p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <GraduationCap size={22} />
              </div>
              <div>
                <h3>Conteúdos para você</h3>
                <p>
                  Cursos, dicas e materiais para desenvolver suas habilidades.
                </p>
              </div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>
                <Users size={22} />
              </div>
              <div>
                <h3>Conecte-se</h3>
                <p>
                  Amplie seu network e conecte-se com recrutadores e
                  profissionais.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Painel Direito  */}
        <div className={styles.rightSection}>
          <div
            className={`${styles.formWrapper} ${isShaking ? styles.shake : ""}`}
          >
            <div className={styles.formHeader}>
              <h2>Criar Conta</h2>
              <p>Preencha seus dados para criar sua conta.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.inputGroup}>
                <label>Nome completo</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    name="nome"
                    placeholder="Digite seu nome completo"
                    value={form.nome}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.nome ? styles.error : ""}`}
                  />
                  <User size={20} className={styles.inputIcon} />
                </div>
                {errors.nome && (
                  <p className={styles.errorMessage}>{errors.nome}</p>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label>CPF</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    name="cpf"
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.cpf ? styles.error : ""}`}
                  />
                  <ShieldUser size={20} className={styles.inputIcon} />
                </div>
                {errors.cpf && (
                  <p className={styles.errorMessage}>{errors.cpf}</p>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label>Data de nascimento (Mínimo 18 anos)</label>
                <div className={styles.inputWrapper}>
                  <input
                    type={dateInputType}
                    name="data_nasc"
                    max={maxDate}
                    placeholder="dd / mm / aaaa"
                    value={form.data_nasc}
                    onChange={handleChange}
                    onFocus={() => setDateInputType("date")}
                    onBlur={(e) => !e.target.value && setDateInputType("text")}
                    className={`${styles.input} ${errors.data_nasc ? styles.error : ""}`}
                  />
                  <Calendar size={20} className={styles.inputIcon} />
                </div>
                {errors.data_nasc && (
                  <p className={styles.errorMessage}>{errors.data_nasc}</p>
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
                    className={`${styles.input} ${errors.telefone ? styles.error : ""}`}
                  />
                  <Phone size={20} className={styles.inputIcon} />
                </div>
                {errors.telefone && (
                  <p className={styles.errorMessage}>{errors.telefone}</p>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label>E-mail</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="email"
                    name="email"
                    placeholder="seu@email.com"
                    value={form.email}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.email ? styles.error : ""}`}
                  />
                  <Mail size={20} className={styles.inputIcon} />
                </div>
                {errors.email && (
                  <p className={styles.errorMessage}>{errors.email}</p>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label>Endereço completo</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    name="endereco"
                    placeholder="Digite seu endereço completo"
                    value={form.endereco}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.endereco ? styles.error : ""}`}
                  />
                  <MapPin size={20} className={styles.inputIcon} />
                </div>
                {errors.endereco && (
                  <p className={styles.errorMessage}>{errors.endereco}</p>
                )}
              </div>

              {/* Senha com verificação */}
              <div className={`${styles.inputGroup} ${styles.passwordGroup}`}>
                <label>
                  Senha (Mín. 6 dígitos, maiúscula, minúscula, número e símbolo)
                </label>
                <div className={styles.senhaBox}>
                  <div className={styles.inputWrapper}>
                    <input
                      type={showSenha ? "text" : "password"}
                      name="senha"
                      placeholder="Crie uma senha forte"
                      value={form.senha}
                      onChange={handleChange}
                      style={{ paddingRight: "44px" }}
                      className={`${styles.input} ${errors.senha ? styles.error : ""}`}
                    />
                    <Lock size={20} className={styles.inputIcon} />
                  </div>

                  <button
                    type="button"
                    className={styles.toggleSenha}
                    onClick={() => setShowSenha(!showSenha)}
                  >
                    {showSenha ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </button>
                </div>

                {form.senha.length > 0 && (
                  <div className={styles.strengthContainer}>
                    <div className={styles.strengthBars}>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={styles.strengthBar}
                          style={{ backgroundColor: getStrengthColor(i) }}
                        />
                      ))}
                    </div>
                    <span className={styles.strengthText}>
                      Força da senha: <strong>{getStrengthLabel()}</strong>
                    </span>
                  </div>
                )}

                {errors.senha && (
                  <p className={styles.errorMessage}>{errors.senha}</p>
                )}
              </div>

              {/* Confirmar Senha com ícone Lock */}
              <div className={`${styles.inputGroup} ${styles.passwordGroup}`}>
                <label>Confirmar senha</label>
                <div className={styles.senhaBox}>
                  <div className={styles.inputWrapper}>
                    <input
                      type={showConfirmSenha ? "text" : "password"}
                      name="confirmSenha"
                      placeholder="Confirme sua senha"
                      value={form.confirmSenha}
                      onChange={handleChange}
                      style={{ paddingRight: "44px" }}
                      className={`${styles.input} ${errors.confirmSenha ? styles.error : ""}`}
                    />
                    <Lock size={20} className={styles.inputIcon} />
                  </div>
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

              <div className={styles.termsGroup}>
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
                <p className={styles.errorMessage}>{errors.termos}</p>
              )}

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
        </div>
      </div>
    </div>
  );
}
