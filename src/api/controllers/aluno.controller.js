import AlunoService from "../../services/aluno.service.js";
import MapPublicId from "../../middlewares/publicId.middleware.js";

class AlunoController {
  static async pegarAlunos(req, res) {
    try {
      const idParams = req.params.id
      const id = await MapPublicId.projetos(idParams)
      const alunos = await AlunoService.pegarAlunos(id);

      return res.json(alunos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Falha ao pegar alunos.' });
    }
  }
  static async pegarAluno(req, res) {
    try {
      const id = req.params.id
      const aluno = await AlunoService.pegarAluno(id);

      return res.json(aluno);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Falha ao pegar aluno.' });
    }
  }
}

export default AlunoController;