import TurmaService from '../../services/turma.service.js';
import MapPublicId from '../../middlewares/publicId.middleware.js';
import CrudPDF from '../../services/crudpdf.service.js';

class TurmaController {
  static async pegarTurmas(req, res) {
    try {
      const userId = req.usuario.id;
      const  idReal = await MapPublicId.usuario(userId)
      const turmas = await TurmaService.pegarTurmas(idReal);

      return res.json(turmas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Falha ao pegar turmas.' });
    }
  }
    static async pegarTurma(req, res) {
    try {
      const turmaId = req.params.id;
      const idReal = await MapPublicId.turma(turmaId)
      const response= await TurmaService.pegarTurma(idReal);

      return res.json(response);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Falha ao pegar turma pelo ID' });
    }
  }

      static async criarTurma(req, res) {
    try {
      const userId = req.usuario.id;
      const idReal = await MapPublicId.usuario(userId)
      const { nome, alunos } = req.body;
      const turma = await TurmaService.criarTurma(idReal, nome, alunos);

      return res.json(turma);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Falha ao pegar turma pelo ID' });
    }
  }
static async editarTurma(req, res) {
    try {
      const {id, nome, alunos } = req.body;
      const idReal = await MapPublicId.turma(id)
      await CrudPDF.apagarPdfsTurma(idReal);
      const turma = await TurmaService.editarTurma(idReal, nome, alunos);

      return res.json(turma);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Falha ao editar turma' });
    }
  }
  static async deletarTurma(req, res) {
    try {
      const id = req.params.id;
      const idReal = await MapPublicId.turma(id)
      await CrudPDF.apagarPdfsTurma(idReal);
      const turma = await TurmaService.deletarTurma(idReal);

      return res.json(turma);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Falha ao deletar turma' });
    }
  }
}

export default TurmaController;
