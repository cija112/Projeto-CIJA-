# CIJA — Centro de Integração Jovem Aprendiz

O CIJA é uma plataforma desenvolvida para conectar jovens aprendizes e empresas de maneira moderna, acessível e eficiente. O projeto foi criado com foco em experiência do usuário, autenticação segura, inteligência artificial integrada para análise de currículos e uma interface profissional totalmente responsiva.

A proposta da plataforma é simplificar o processo de cadastro, login, gerenciamento de acessos e otimização inteligente de currículos voltada para sistemas ATS (*Applicant Tracking Systems*).

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React**
- **TypeScript**
- **Vite**
- **React Router DOM**
- **CSS Modules**

### Backend & Inteligência Artificial
- **Node.js**
- **TypeScript**
- **Ollama** (Modelo *Qwen 2.5:3b* para auditoria, pontuação e reestruturação cirúrgica de currículos)

### Banco de Dados & Infraestrutura
- **Supabase** (Autenticação e gerenciamento de dados)

---

## 🚀 Funcionalidades

### Área do Jovem Aprendiz
- Cadastro completo
- Login autenticado
- Recuperação de senha
- Validação de CPF e telefone
- Verificação de idade mínima
- Feedback visual em tempo real
- **Auditoria e Reestruturação de Currículo por IA** (Análise de compatibilidade ATS, cálculo de notas, identificação de pontos fortes/atenção e sugestões estratégicas)

### Área Empresarial
- Login empresarial separado
- Controle de acesso por autenticação
- Estrutura preparada para dashboard de gestão de vagas

### Sistema
- Integração com Supabase Auth
- Processamento de IA via motor local/servidor com Ollama (`qwen2.5:3b`)
- Validações frontend e backend
- Animações de sucesso e erro
- Máscaras automáticas de campos
- Totalmente responsivo para dispositivos móveis

---

##  Interface

O projeto utiliza uma interface moderna baseada em:
- Glassmorphism
- Componentização avançada
- Animações suaves
- Layout responsivo
- Feedback visual em tempo real

---

## 📱 Responsividade

A aplicação foi desenvolvida para funcionar corretamente em:
- Smartphones
- Tablets
- Notebooks
- Monitores desktop

---

##  Segurança & Arquitetura

O sistema utiliza:
- Autenticação via Supabase.
- Controle de sessão e proteção de rotas.
- Validação rigorosa de dados de entrada.
- Processamento estruturado de respostas em JSON via IA

---

## ⚙️ Executando o Projeto

1. Instale as dependências do frontend/projeto:
   ```bash
   npm install
