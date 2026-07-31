import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import styles from "./vagasEmpresa.module.css";
import { SidebarEmpresa } from "../../../components/sideBar/sideBarEmpresa";
import { useDocumentTitle } from "Hooks/useDocumentTitle";

interface Vaga {
  id_vag: string;
  id_em: string;
  titulo: string;
  descricao: string;
  carga_horaria: number;
  salario: number;
  data_publicada: string;
  cidade: string;
  estado: string; 
  tipo: string;
  contrato: string;
}

export const VagasEmpresa: React.FC = () => {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string>("");
  const [isVagaOpen, setIsVagaOpen] = useState<boolean>(false);
  const [editingVaga, setEditingVaga] = useState<Vaga | null>(null);
  const [vagaParaExcluir, setVagaParaExcluir] = useState<Vaga | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  useDocumentTitle("CIJA - Vagas da Empresa");
  const [cargaHoraria, setCargaHoraria] = useState<number>(0);
  const [salario, setSalario] = useState<number>(0);
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [tipo, setTipo] = useState("");
  const [contrato, setContrato] = useState(""); 

  useEffect(() => {
    buscarEmpresasEVagas();
  }, []);

  async function buscarEmpresasEVagas() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await carregarVagas(user.id);
      }
    } catch (err) {
      console.error("Erro inicial:", err);
    } finally {
      setLoading(false);
    }
  }

  async function carregarVagas(empresaId: string) {
    const { data, error } = await supabase
      .from("vaga")
      .select("*")
      .eq("id_em", empresaId)
      .order("data_publicada", { ascending: false });

    if (!error && data) {
      setVagas(data as Vaga[]);
    }
  }

  function abrirVaga(vaga: Vaga | null = null) {
    if (vaga) {
      setEditingVaga(vaga);
      setTitulo(vaga.titulo);
      setDescricao(vaga.descricao);
      setCargaHoraria(vaga.carga_horaria);
      setSalario(vaga.salario);
      setCidade(vaga.cidade);
      setEstado(vaga.estado);
      setTipo(vaga.tipo);
      setContrato(vaga.contrato); 
    } else {
      setEditingVaga(null);
      setTitulo("");
      setDescricao("");
      setCargaHoraria(0);
      setSalario(0);
      setCidade("");
      setEstado("");
      setTipo("");
      setContrato("");
    }
    setIsVagaOpen(true);
  }

  async function salvarVaga(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) return;

    if (Number(cargaHoraria) > 100) {
      alert("A carga horária máxima permitida é de 100 horas semanais.");
      return;
    }

    const estadosValidos = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
    if (!estadosValidos.includes(estado.trim().toUpperCase())) {
      alert("Estado inválido. Use a sigla de dois caracteres (ex: SP, RJ, MG).");
      return;
    }

    if (Number(salario) > 10000) {
      alert("O salário máximo permitido é de R$ 10.000,00.");
      return;
    }

    try {
      // Força a busca do utilizador atualizado diretamente na sessão
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert("Sessão expirada. Por favor, faça login novamente.");
        return;
      }

      const dadosVaga = {
        id_em: user.id, 
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        carga_horaria: Number(cargaHoraria),
        salario: Number(salario),
        cidade: cidade.trim(),
        estado: estado.trim(),
        tipo,
        contrato
      };

      if (editingVaga) {
        const { error } = await supabase
          .from("vaga")
          .update(dadosVaga)
          .eq("id_vag", editingVaga.id_vag);
          
        if (error) throw error;
        alert("Vaga atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("vaga")
          .insert([{ ...dadosVaga, data_publicada: new Date().toISOString() }]);
          
        if (error) throw error;
        alert("Vaga publicada com sucesso!");
      }

      setIsVagaOpen(false);
      carregarVagas(user.id);
    } catch (err: any) {
      console.error("Erro ao salvar vaga:", err);
      alert(`Não foi possível salvar a vaga: ${err.message || "Erro de permissão no Supabase"}`);
    }
  }

  async function confirmarExclusao() {
    if (!vagaParaExcluir) return;

    try {
      const { error } = await supabase
        .from("vaga")
        .delete()
        .eq("id_vag", vagaParaExcluir.id_vag);

      if (error) throw error;
      
      setVagaParaExcluir(null); 
      carregarVagas(userId);   
    } catch (err) {
      console.error("Erro ao deletar vaga:", err);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <SidebarEmpresa />
        <div className={styles.mainWrapper}>
          <main className={styles.content} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "18px", color: "#a855f7", fontWeight: 600 }}>Carregando vagas...</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <SidebarEmpresa />

      <div className={styles.mainWrapper}>
        <main className={styles.content}>
          <div className={styles.headerArea}>
            <div>
              <h1>Minhas Vagas</h1>
              <p>Gerencie, publique e atualize as oportunidades de emprego da sua empresa.</p>
            </div>
            <button className={styles.btnCriar} onClick={() => abrirVaga()}>
              Criar Nova Vaga
            </button>
          </div>

          <div className={styles.vagasGrid}>
            {vagas.length === 0 ? (
              <p className={styles.semVagas}>Nenhuma vaga cadastrada ainda.</p>
            ) : (
              vagas.map((vaga) => (
                <div key={vaga.id_vag} className={styles.cardVaga}>
                  <div className={styles.cardHeader}>
                    <h2>{vaga.titulo}</h2>
                    <span className={styles.dataTag}>
                      {new Date(vaga.data_publicada).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p 
                  className={styles.descricaoText}>{vaga.descricao}</p>
                  <div className={styles.localizacaoInfo}>
                <span>{vaga.cidade} - {vaga.estado}</span>
                </div>  
                  <div className={styles.metaInfo}>
                    <span>{vaga.carga_horaria}h semanais</span>
                    <span>{vaga.tipo}</span> </div>
                  <div className={styles.metaInfo}>
                    <span>{vaga.contrato}</span>
                    <span>R$ {vaga.salario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className={styles.acoesArea}>
                    <button className={styles.btnEditar} onClick={() => abrirVaga(vaga)}>
                      Editar
                    </button>
                    <button className={styles.btnExcluir} onClick={() => setVagaParaExcluir(vaga)}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {isVagaOpen && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContainer}>
                <h2>{editingVaga ? "Editar Oportunidade" : "Anunciar Nova Vaga"}</h2>
                <form onSubmit={salvarVaga} className={styles.vagaForm}>
                  <div className={styles.inputGroup}>
                    <label>Título da Vaga</label>
                    <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Descrição das Atividades (Mínimo 10 caracteres / Máximo 2000)</label>
                    <textarea 
                      value={descricao} 
                      onChange={(e) => setDescricao(e.target.value)} 
                      rows={6} 
                      maxLength={3000} 
                      required 
                    />
                    
                    <span style={{ fontSize: "12px", color: "#94a3b8", textAlign: "right", marginTop: "4px" }}>
                      {descricao.length} / 2000 caracteres
                    </span>
                  </div>

                  <div className={styles.rowInputs}>
                    <div className={styles.inputGroup}>
                      <label>Carga Horária (horas/semana)</label>
                      <input 
                        type="number" 
                        min="1"
                        max="100" 
                        value={cargaHoraria || ""} 
                        onChange={(e) => setCargaHoraria(Number(e.target.value))} 
                        required 
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Salário Mensal (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        max="10000" 
                        value={salario || ""} 
                        onChange={(e) => setSalario(Number(e.target.value))} 
                        required 
                      />
                    </div>
                  </div>
                  <div className={styles.rowInputs}>
                    <div className={styles.inputGroup}>
                      <label>Cidade</label>
                      <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} required />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Estado (Sigla)</label>
                      <input 
                        type="text" 
                        maxLength={2}
                        value={estado}
                        onChange={(e) => setEstado(e.target.value.toUpperCase())}
                        required 
                      />
                    </div>
                  </div>
                  <div className={styles.rowInputs}>
                    <div className={styles.inputGroup}>
                      <label>Tipo de Vaga</label>
                      <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                        <option value="">Selecione</option>
                        <option value="Presencial">Presencial</option>
                        <option value="Remoto">Remoto</option>
                        <option value="Híbrido">Híbrido</option>
                      </select>
                    </div>
                  </div>
                    <div className={styles.rowInputs}>
                    <div className={styles.inputGroup}>
                      <label>Tipo de Contrato</label>
                      <select value={contrato} onChange={(e) => setContrato(e.target.value)} required>
                        <option value="">Selecione</option>
                        <option value="CLT">CLT</option>
                        <option value="PJ">PJ</option>
                        <option value="Estágio">Estágio</option>
                        <option value="Temporário">Temporário</option>
                      </select>
                    </div>
                  </div>                                
                  <div className={styles.modalAcoes}>
                    <button type="button" className={styles.btnCancelar} onClick={() => setIsVagaOpen(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className={styles.btnSalvarForm}>
                      {editingVaga ? "Salvar Alterações" : "Publicar Vaga"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
          )}

          {vagaParaExcluir && (
            <div className={styles.modalOverlay}>
              <div className={`${styles.modalContainer} ${styles.modalAlerta}`}>
                <h3>Remover Vaga</h3>
                <p>
                  Você tem certeza que quer excluir permanentemente a vaga de{" "}
                  <strong>{vagaParaExcluir.titulo}</strong>? Esta ação não poderá ser desfeita.
                </p>
                <div className={styles.modalAcoes}>
                  <button type="button" className={styles.btnCancelar} onClick={() => setVagaParaExcluir(null)}>
                    Voltar
                  </button>
                  <button type="button" className={styles.btnConfirmarDeletar} onClick={confirmarExclusao}>
                    Sim, Excluir
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default VagasEmpresa;