import AlunoRepository from '../repositories/aluno.repository.js';

class AlunoService{
    static async pegarAlunos(id) {
        if (!id) {
        throw new Error("id não informado");
        }
        return AlunoRepository.findAlunosById(id);
    }
    static async pegarAluno(id) {
        if (!id) {
        throw new Error("id não informado");
        }
        return AlunoRepository.findById(id);
    }
}

export default AlunoService;
