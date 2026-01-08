import express from "express";
const router = express.Router();
import multer from 'multer';
import AlunoController from "../controllers/aluno.controller.js";


router.get(
  "/turma/:id/",
  AlunoController.pegarAlunos
);

router.get(
  "/:id/",
  AlunoController.pegarAluno
);

export default router;
