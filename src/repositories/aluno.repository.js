// src/repositories/prova.repository.js
import { db } from '../config/database.js'; 

class AlunoRepository {
  static async findAlunosById(id) {

    const [projeto] = await db.execute(
      `SELECT ID_turma 
       FROM Projetos 
       WHERE ID = ? `,
      [id]
    );
    const { ID_turma } = projeto[0];


    const [rowsalunos] = await db.execute(
      "SELECT ID, nome FROM aluno WHERE ID_turma = ?",
      [ID_turma]
    );

    return rowsalunos;
  }
  
    static async findByTurma(turmaId) {
    const [rowsAlunos] = await db.execute(
        `
        SELECT
        a.ID as ID_aluno,
        a.nome,
        a.email,
        ap.ID_projeto,
        ap.tematica,
        ap.questoes_descritivas,
        ap.questoes_objetivas,
        ap.questoes_associativas,
        ap.dica,
        ap.auxilio_visao
        FROM aluno a
        INNER JOIN aluno_projeto ap 
        ON ap.ID_aluno = a.ID
        WHERE a.ID_turma = ?
        `,
        [turmaId]
    );

    return rowsAlunos;
    }
    static async findById(id) {
    const [rowsAluno] = await db.execute(
        `
        SELECT
        a.ID,
        a.nome,
        a.email,
        ap.ID_projeto,
        ap.tematica,
        ap.questoes_descritivas,
        ap.questoes_objetivas,
        ap.questoes_associativas,
        ap.dica,
        ap.auxilio_visao
        FROM aluno a
        INNER JOIN aluno_projeto ap 
        ON ap.ID_aluno = a.ID
        WHERE a.ID = ?
        `,
        [id]
    );

    return rowsAluno[0];
    }

}


export default AlunoRepository;