// src/api/controllers/prova.controller.js
import provaService from '../../services/prova.service.js';
import ProjetoService from '../../services/projeto.service.js';
import MapPublicId from '../../middlewares/publicId.middleware.js';
import MaterialService from '../../services/material.service.js';
import CrudPDF from '../../services/crudpdf.service.js';
import path from "path";
import fs from "fs";
import PagamentoRepository from '../../repositories/pagamento.repository.js';
import PagamentoService from '../../services/pagamento.service.js';

class ProvaController {
  async gerarProvas(req, res, next) {
    try {
      const projetoId = req.params.id;
      const userId = req.usuario.id;
      const realUserId = await MapPublicId.usuario(userId)
const imprimirGabarito = req.query.imprimirGabarito === "true";
      const idReal = await MapPublicId.projetos(projetoId)



      let dadosInput = await ProjetoService.pegarPorIdReal(idReal);
      // Isso é o pdf do material é diferente do de baixo
      const pdf = await MaterialService.getPdfByProjetoId(idReal);


      if (pdf) {
        dadosInput.pdfBuffer = pdf.buffer
      }
      dadosInput.imprimirGabarito = imprimirGabarito
      for(let i = 0; i < 2; i ++){
        const pdfGerado = await provaService.orquestrarGeracaoProvas(dadosInput);


        await CrudPDF.salvarPdfProjeto(projetoId, dadosInput.imprimirGabarito, pdfGerado);
        dadosInput.imprimirGabarito = !imprimirGabarito

        
      }

        const nome = imprimirGabarito ? "prova_gabarito.pdf" : "prova.pdf";
        const filePathEnviar = path.join(
          process.env.STORAGE_PATH,
          "pdfs",
          "projetos",
          String(projetoId),
          nome
        );

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "inline");


          fs.createReadStream(filePathEnviar).pipe(res);
          await PagamentoRepository.reduzirProva(realUserId)

      

    } catch (error) {
      // 5. Enviar erros para o middleware de erro
      next(error);
    }
  }
  async pegarProvas(req, res, next) {
    try {
      const projetoId = req.params.id;

const imprimirGabarito = req.query.imprimirGabarito === "true";

      // const idReal = await MapPublicId.projetos(projetoId)


      // const filePath = CrudPDF.getPdfPath(projetoId, imprimirGabarito);

      // fs.access(filePath);
      const nome = imprimirGabarito ? "prova_gabarito.pdf" : "prova.pdf";
      

      const filePathEnviar = path.join(
        process.env.STORAGE_PATH,
        "pdfs",
        "projetos",
        String(projetoId),
        nome
      );

      if (!fs.existsSync(filePathEnviar)) {
        return res.status(404).json({ error: "PDF não encontrado" });
      }


        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");

        fs.createReadStream(filePathEnviar).pipe(res);




    } catch  {
      return res.status(500).json({ error: "Nenhum pdf encontrado" });
      // 5. Enviar erros para o middleware de erro
      next(error);
    }
  }
  async me(req, res, next) {
  try {
    const userId =  req.usuario.id;
    const realUserId = await MapPublicId.usuario(userId)
    const result = await PagamentoService.me(realUserId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
}

export default new ProvaController();