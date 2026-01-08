import TurmaRepository from '../repositories/turma.repository.js';
import { nanoid } from 'nanoid';

class TurmaService {
  static async pegarTurmas(userId) {
    if (!userId) {
      throw new Error("UserId não informado");
    }

    return TurmaRepository.findByUsuario(userId);
  }
  static async pegarTurma(turmaId) {
    if (!turmaId) {
      throw new Error("turmaId não informado");
    }
    return TurmaRepository.findById(turmaId);
  }

  static async criarTurma(userId, nome, alunos) {
    if (!userId) {
      throw new Error("userId não informado");
    }
    if (!nome) {
      throw new Error("nome não informado");
    }
    if (!alunos) {
      throw new Error("nome não informado");
    }
    const publicId = nanoid(10);
    return TurmaRepository.criarTurma(userId, nome, alunos, publicId);
  }
  static async editarTurma(id, nome, alunos) {
    if (!id) {
      throw new Error("userId não informado");
    }
    if (!nome) {
      throw new Error("nome não informado");
    }
    if (!alunos) {
      throw new Error("alunos não informado");
    }
    return TurmaRepository.editarTurma(id, nome, alunos);
  }
  static async deletarTurma(turmaId) {
    if (!turmaId) {
      throw new Error("turmaId não informado");
    }
    return TurmaRepository.deleteById(turmaId);
  }
}
export default TurmaService;
