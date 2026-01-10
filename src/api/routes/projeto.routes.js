import express from "express";
const router = express.Router();
import multer from 'multer';
import AuthMiddleware from "../../middlewares/auth.middleware.js";
import ProjetoController from "../controllers/projeto.controller.js";

router.post(
  "/:id/aluno",
  ProjetoController.enviarAluno
)

// router.get(
//   "/id-publico/:id/",
//   ProjetoController.pegarProjetoPorIdPublico
// );

router.use(AuthMiddleware.authenticate);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Apenas PDF é permitido'), false);
    }
    cb(null, true);
  }
});

// GET /turmas/:id/projetos
router.get(
  "/turmas/:id/",
  ProjetoController.pegarProjetosPorTurma
);

router.get(
  "/turmas/",
  ProjetoController.pegarProjetosPorUser
);

router.get(
  "/:id/",
  ProjetoController.pegarProjetoPorId
);

router.put(
  "/:id/",
  upload.single('pdfBuffer'),
  ProjetoController.editarProjeto
);

router.post(
  "/",
  upload.single('pdfBuffer'),
  ProjetoController.criarProjeto
);

router.delete(
  "/:id/",
  ProjetoController.deletarProjeto
);

// Se precisar validar o premium

router.use(AuthMiddleware.premium);

router.get(
  "/:id/provas",
  ProjetoController.pegarProvasProjeto
);

router.put(
  "/:id/provas",
  ProjetoController.salvarProvasProjeto
);

export default router;