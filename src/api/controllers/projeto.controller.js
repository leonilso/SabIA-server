import ProjetoService from "../../services/projeto.service.js";
import MapPublicId from "../../middlewares/publicId.middleware.js";
import CrudPDF from "../../services/crudpdf.service.js";

class ProjetoController {
  static async pegarProjetosPorTurma(req, res) {
    try {
      const turmaId = req.params.id;
      const turmaIdReal = await MapPublicId.turma(turmaId)
      const userId = req.usuario.id;
      const userIdReal = await MapPublicId.usuario(userId)



      const projetos = await ProjetoService.pegarPorTurma(
        turmaIdReal,
        userIdReal
      );

      return res.json(projetos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao buscar projetos" });
    }
  }

  static async pegarProvasProjeto(req, res) {
    try {
      const projetoId = req.params.id;
      const projetoIdReal = await MapPublicId.projetos(projetoId)
      const userId = req.usuario.id;
      const userIdReal = await MapPublicId.usuario(userId)
      const provas = await ProjetoService.pegarProvasProjeto(
        projetoIdReal,
        userIdReal
      );



      return res.json(provas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao buscar provas do projeto" });
    }
  }
  static async salvarProvasProjeto(req, res) {
    try {
      const projetoId = req.params.id;
      const projetoIdReal = await MapPublicId.projetos(projetoId)
      const userId = req.usuario.id;
      const userIdReal = await MapPublicId.usuario(userId)
      const {provas} = req.body
      await CrudPDF.apagarPdfsProjeto(projetoId);
      await ProjetoService.salvarProvasProjeto(
        projetoIdReal,
        userIdReal,
        provas
      );

      return res.json("Provas salvas");
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao buscar provas do projeto" });
    }
  }
  static async pegarProjetosPorUser(req, res) {
    try {
      const userId = req.usuario.id;
      const idReal = await MapPublicId.usuario(userId)
      const projetos = await ProjetoService.pegarPorUser(
        idReal
      );

      return res.json(projetos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao buscar projetos" });
    }
  }
  static async pegarProjetoPorId(req, res) {
    try {
      const projetoId = req.params.id;
      const idReal = await MapPublicId.projetos(projetoId)
      const projeto = await ProjetoService.pegarPorId(
        idReal,
      );


      return res.json(projeto);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao buscar projeto" });
    }
  }
  // static async pegarProjetoPorIdPublico(req, res) {
  //   try {
  //     const projetoId = req.params.id;
  //     const idReal = await MapPublicId.projetos(projetoId)

  //     const projeto = await ProjetoService.pegarPorIdPublico(
  //       idReal,
  //     );

  //     return res.json(projeto);
  //   } catch (error) {
  //     console.error(error);
  //     return res.status(500).json({ error: "Erro ao buscar projeto" });
  //   }
  // }
  static async editarProjeto(req, res) {
    try {
      const projetoId = req.params.id;
      const IdReal = await MapPublicId.projetos(projetoId)
      await CrudPDF.apagarPdfsProjeto(projetoId);


      const {disciplina, turma, qtdProvas, qtdQuestoes} = req.body;
      const questoes = typeof req.body.questoes === 'string' ? JSON.parse(req.body.questoes) : req.body.questoes;
      const temas = typeof req.body.temas === 'string' 
              ? JSON.parse(req.body.temas) 
              : req.body.temas;
      const userId = req.usuario.id;
      const userIdReal = await MapPublicId.usuario(userId)
      const turmaIdReal = await MapPublicId.turma(turma)
      const pdfBuffer = req.file ? req.file.buffer : null;
      const pdfOriginalName = req.file ? req.file.originalname : null;
      const pdfMimeType = req.file ? req.file.mimetype : null;
      const pdfSize = req.file ? req.file.size : null;

        const dados = {
        disciplina, 
        turma: turmaIdReal, 
        questoes,
        qtdProvas, 
        qtdQuestoes, 
        temas, 
        userId: userIdReal, 
        pdfBuffer,
        pdfOriginalName,
        pdfMimeType,
        pdfSize
      };

      const projeto = await ProjetoService.editarProjeto(IdReal, 
        dados
      );

      return res.json(projeto);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao editar projeto" });
    }
  }
  static async criarProjeto(req, res) {
    try {
      const {disciplina, turma, qtdProvas, qtdQuestoes} = req.body;
      const temas = typeof req.body.temas === 'string' 
                    ? JSON.parse(req.body.temas) 
                    : req.body.temas;
      const questoes = typeof req.body.questoes === 'string' ? JSON.parse(req.body.questoes) : req.body.questoes;
      const userId = req.usuario.id;
      
      const userIdReal = await MapPublicId.usuario(userId)
      const turmaIdReal = await MapPublicId.turma(turma)
      const pdfBuffer = req.file ? req.file.buffer : null;
            const pdfOriginalName = req.file ? req.file.originalname : null;
      const pdfMimeType = req.file ? req.file.mimetype : null;
      const pdfSize = req.file ? req.file.size : null;

            const dados = {
        disciplina, 
        turma: turmaIdReal, 
        questoes,
        qtdProvas, 
        qtdQuestoes, 
        temas, 
        userId: userIdReal, 
        pdfBuffer,
        pdfOriginalName,
        pdfMimeType,
        pdfSize
      };

      const projeto = await ProjetoService.criarProjeto(dados);

      return res.json(projeto);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao criar projeto" });
    }
  }
  static async enviarAluno(req, res) {
    try {
      const { id, questoes, tema, adaptacoes} = req.body;


      const projetoId = req.params.id
       const projetoIdReal = await MapPublicId.projetos(projetoId)
       await CrudPDF.apagarPdfsProjeto(projetoId);

      

      const dados = {
        id, 
        questoes, 
        tema, 
        adaptacoes, 
        projetoId: projetoIdReal, 
      };

      await ProjetoService.enviarAluno(dados);

      return res.json("Dados enviados");
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao enviar dados ao projeto" });
    }
  }
  static async deletarProjeto(req, res) {
    try {
      const projetoId = req.params.id;
      const projetoIdReal = await MapPublicId.projetos(projetoId)
      await CrudPDF.apagarPdfsProjeto(projetoId);

      const projeto = await ProjetoService.deletarProjeto(
        projetoIdReal,
      );

      return res.json(projeto);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao deletar projeto" });
    }
  }
  
}

export default ProjetoController;
