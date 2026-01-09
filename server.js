// 1. Carrega as variáveis de ambiente (deve ser a primeira linha)
// Isso torna process.env.DB_HOST, process.env.PORT, etc., disponíveis
import dotenv from "dotenv";
dotenv.config();

// 2. Importações principais
import express from 'express';
import cors from 'cors';

// 3. Importação dos Módulos da Aplicação
import errorHandler from "./src/middlewares/errorHandler.js";
import provaRoutes from './src/api/routes/prova.routes.js';
import authRoutes from './src/api/routes/auth.routes.js';
import turmaRoutes from './src/api/routes/turma.routes.js';
import projetoRoutes from './src/api/routes/projeto.routes.js';
import alunoRoutes from './src/api/routes/aluno.routes.js';
import pagamentoRoutes from './src/api/routes/pagamento.routes.js';
import verificaEmailRoutes from './src/api/routes/verify.routes.js';
import gabaritoRoutes from './src/api/routes/gabarito.routes.js';
import usuariosRoutes from './src/api/routes/usuario.routes.js';
import rateLimit from 'express-rate-limit';
// (Aqui você importaria outras rotas, ex: usuario.routes.js.js)
import webhookRoutes from "./src/api/routes/webhook.routes.js";






// 4. Inicialização do App Express
const app = express();

// O webhook da stripe se embaraça com o express.json
app.use('/api/stripe', webhookRoutes)

// 5. Configuração de Middlewares Globais
// Habilita o Cross-Origin Resource Sharing (essencial para APIs)
app.use(cors({
  origin: process.env.FRONT_URL
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

// Aplica o rate limiter para todas as rotas
app.use(limiter);

// Middleware nativo do Express para parsear requisições com body JSON
app.use(express.json());

// Middleware nativo do Express para parsear requisições 'urlencoded' (formulários)
app.use(express.urlencoded({ extended: true }));

// 6. Rota "Health Check" (Boa prática)
// Uma rota simples para verificar se a API está online
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API Gerador de Provas no ar!' });
});

// 7. Registro das Rotas da Aplicação
// Todas as rotas de provas serão prefixadas com /api/provas
app.use('/api/alunos', alunoRoutes)
app.use('/api/provas', provaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/turmas', turmaRoutes);
app.use("/api/projetos", projetoRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/gabarito', gabaritoRoutes);
app.use('/api/verify-email', verificaEmailRoutes)

app.use('/api/pagamento', pagamentoRoutes)


// Ex: app.use('/api/usuarios', usuarioRoutes);
// Ex: app.use('/api/turmas', turmaRoutes);

// 8. Middleware de Tratamento de Erros (IMPORTANTE)
// Este deve ser o ÚLTIMO 'app.use()' a ser registrado.
// Ele "pega" todos os erros que ocorrem nos controladores e serviços.
app.use(errorHandler);

// 9. Inicialização do Servidor
// Pega a porta do .env ou usa 3000 como padrão
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  // (Opcional: aqui você pode adicionar um log de teste de conexão com o DB)
});

export default app; // Exporta o 'app' para possíveis testes