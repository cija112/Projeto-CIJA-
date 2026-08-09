// URL base do backend NestJS.
//
// Em produção (Render) usa o domínio padrão.
// Em desenvolvimento local, defina REACT_APP_API_URL=http://localhost:3001
// no .env para apontar para o backend rodando localmente.
//
// CRA só embute variáveis de ambiente que começam com REACT_APP_, então
// qualquer mudança aqui exige reiniciar `npm start`.
const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://cija-backend.onrender.com';

export default API_BASE_URL;