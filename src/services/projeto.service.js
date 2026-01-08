import MapPublicId from "../middlewares/publicId.middleware.js";
import ProjetoRepository from "../repositories/projeto.repository.js";
import MaterialService from "./material.service.js";
import { nanoid } from 'nanoid';

class ProjetoService {
  static #validarDados(dados) {
    const { disciplina, turma, qtdProvas, questoes, qtdQuestoes, temas, userId } = dados;

    if (!disciplina || typeof disciplina !== 'string' || disciplina.trim().length < 3) {
      throw new Error("Disciplina é obrigatória e deve ter pelo menos 3 caracteres.");
    }
    if (!turma) {
      throw new Error("A turma deve ser informada.");
    }
    if (!userId) {
      throw new Error("ID do usuário não identificado.");
    }
    
    // Validando números (garantindo que sejam maiores que zero)
    const nProvas = parseInt(qtdProvas);
    const nQuestoes = parseInt(qtdQuestoes);
    if (isNaN(nProvas) || nProvas <= 0) {
      throw new Error("A quantidade de provas deve ser um número maior que zero.");
    }
    if (isNaN(nQuestoes) || nQuestoes <= 0) {
      throw new Error("A quantidade de questões deve ser um número maior que zero.");
    }

    // Validando Temas (deve ser um array e não estar vazio)
    if (!Array.isArray(temas) || temas.length === 0) {
      throw new Error("Pelo menos um tema/aula deve ser adicionado.");
    }

    return { ...dados, qtdProvas: nProvas, qtdQuestoes: nQuestoes };
  }

  static async pegarPorTurma(turmaId, userId) {
    if (!userId) {
      throw new Error("Parâmetros inválidos");
    }

    return ProjetoRepository.findByTurma(turmaId, userId);
  }
  static async pegarProvasProjeto(projetoId, userId) {
    if (!userId) {
      throw new Error("Parâmetros inválidos");
    }
    if (!projetoId) {
      throw new Error("Parâmetros inválidos");
    }

    return ProjetoRepository.findTestById(projetoId, userId);
  }
  static async salvarProvasProjeto(projetoId, userId, provas) {
    if (!userId) {
      throw new Error("Parâmetros inválidos");
    }
    if (!projetoId) {
      throw new Error("Parâmetros inválidos");
    }
    if (!provas) {
      throw new Error("Parâmetros inválidos");
    }

    return ProjetoRepository.saveTestById(projetoId, userId, provas);
  }
  static async pegarPorUser(userId) {
    if (!userId) {
      throw new Error("Parâmetros inválidos");
    }

    return ProjetoRepository.findByUser(userId);
  }
  static async pegarPorId(projetoId) {
    if (!projetoId) {
      throw new Error("projetoId inválido");
    }

    return ProjetoRepository.findById(projetoId);
  }
  static async pegarPorIdReal(projetoId) {
    if (!projetoId) {
      throw new Error("projetoId inválido");
    }

    return ProjetoRepository.findByIdReal(projetoId);
  }

  // static async pegarPorIdPublico(projetoId) {
  //   if (!projetoId) {
  //     throw new Error("projetoId inválido");
  //   }

  //   return ProjetoRepository.findByIdPublic(projetoId);
  // }

  static async editarProjeto(projetoId, dados) {
    if (!projetoId) {
      throw new Error("projetoId inválido");
    }
    const dadosValidados = this.#validarDados(dados);
    await MaterialService.deleteByProjetoId(projetoId)
    if(dados.pdfBuffer){
      await MaterialService.upload({ buffer: dados.pdfBuffer, originalName: dados.pdfOriginalName, mimeType: dados.pdfMimeType, size: dados.pdfSize }, { projetoId })
    }
    return ProjetoRepository.editById(projetoId, dadosValidados);
  }
  static async criarProjeto(dados) {
    const dadosValidados = this.#validarDados(dados);
    const publicId = nanoid(10);
    const projeto = await ProjetoRepository.create(dadosValidados, publicId);
    const projetoId = await MapPublicId.projetos(publicId);
    if(dados.pdfBuffer){

      await MaterialService.upload({ buffer: dados.pdfBuffer, originalName: dados.pdfOriginalName, mimeType: dados.pdfMimeType, size: dados.pdfSize }, { projetoId })
    }

    return projeto;
  }

  static async enviarAluno(dados) {
    if(!dados.id){
      throw new Error("Nome não foi escolhido");
    }
    
    return ProjetoRepository.enviarAluno(dados);
  }
  static async deletarProjeto(projetoId) {
    if (!projetoId) {
      throw new Error("projetoId inválido");
    }
    await MaterialService.deleteByProjetoId(projetoId)
    return ProjetoRepository.deleteById(projetoId);
  }
}

export default ProjetoService;
