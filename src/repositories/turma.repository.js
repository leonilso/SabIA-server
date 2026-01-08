// src/repositories/prova.repository.js
import { db } from '../config/database.js'; 
import MaterialService from '../services/material.service.js';
class TurmaRepository {
  static async findByUsuario(userId) {
    
    const [rows] = await db.execute(
      "SELECT public_id as ID_turma, nome_turma, ID_usuario FROM turma WHERE ID_usuario = ?",
      [userId]
    );
    return rows;
  }
  static async findById(turmaId) {
    const [rows] = await db.execute(
      "SELECT public_id as ID_turma, nome_turma, ID_usuario FROM turma WHERE ID = ?",
      [turmaId]
    );
    const [rowsalunos] = await db.execute(
      "SELECT ID as ID_aluno, ID_turma, email, nome FROM aluno WHERE ID_turma = ?",
      [turmaId]
    );
    const response = {
      turma: rows[0],
      alunos: rowsalunos
    }
    return response;
  }
static async criarTurma(userId, nome, listaAlunos, publicId) {
    // Iniciamos uma transação para garantir que ou salva tudo, ou não salva nada
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Inserir a Turma
        const [resultTurma] = await connection.execute(
            "INSERT INTO turma (nome_turma, ID_usuario, public_id) VALUES (?, ?, ?)",
            [nome, userId, publicId]
        );
        const newTurmaId = resultTurma.insertId;

        // 2. Inserir cada aluno da lista
        for (const aluno of listaAlunos) {
            await connection.execute(
                `INSERT INTO aluno 
                (ID_turma, email, nome) 
                VALUES (?, ?, ?)`,
                [
                    newTurmaId,
                    aluno.email, 
                    aluno.nome, 
                ]
            );
        }


        await connection.commit();
        return { success: true, turmaId: publicId };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
static async editarTurma(idTurma, nome, listaAlunos) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        // const [consultaid] = await connection.execute(
        //     "SELECT ID FROM TURMA WHERE public_id = ?",
        //     [publicId]
        // );
        // const idTurma = consultaid[0];

        // 1. Atualiza a Turma (com trava de segurança)
        const [res] = await connection.execute(
            "UPDATE turma SET nome_turma = ? WHERE ID = ?",
            [nome, idTurma]
        );

        if (res.affectedRows === 0) throw new Error("Turma não encontrada.");


        const listaIds = listaAlunos.map(item => item.ID_aluno).filter(element => element !== undefined);

        const placeholders = listaIds.map(() => '?').join(',');
        

        const query = `DELETE FROM aluno WHERE ID_turma = ? AND ID NOT IN (${placeholders})`;

        if (listaIds.length === 0) {
            await connection.execute("DELETE FROM aluno WHERE ID_turma = ?", [idTurma]);
        } else {
            await connection.execute(query, [idTurma, ...listaIds]);
        }

        // 3. Insere a nova lista atualizada
         for (const aluno of listaAlunos) {
            if(aluno.isNew)
            await connection.execute(
                `INSERT INTO aluno 
                (ID_turma, email, nome) 
                VALUES (?, ?, ?)`,
                [
                    idTurma,
                    aluno.email, 
                    aluno.nome
                ]
            );
        }

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
    static async deleteById(idTurma) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [ idsProjetos ] = await connection.execute(`
                SELECT ID FROM Projetos WHERE ID_turma = ?
            `, [idTurma]);

            idsProjetos.forEach(async (item)=>{
                MaterialService.deleteByProjetoId(item.ID)
            })

            // 1. Deletar as associações de temas dos projetos desta turma
            // Usamos um subquery para achar os IDs dos projetos que pertencem à turma
            await connection.execute(`
                DELETE FROM Tema_projeto 
                WHERE ID_projeto IN (SELECT ID FROM Projetos WHERE ID_turma = ?)
            `, [idTurma]);

            // 2. Deletar os projetos da turma
            await connection.execute(`
                DELETE FROM Projetos WHERE ID_turma = ?
            `, [idTurma]);

            // 3. Deletar os alunos da turma
            await connection.execute(`
                DELETE FROM aluno WHERE ID_turma = ?
            `, [idTurma]);

            // 4. Agora sim, deletamos a turma
            const [result] = await connection.execute(
                "DELETE FROM turma WHERE ID = ?",
                [idTurma]
            );

            if (result.affectedRows === 0) {
                throw new Error("Turma não encontrada.");
            }

            await connection.commit();
            return { success: true, message: "Turma e todas as dependências excluídas!" };

        } catch (error) {
            await connection.rollback();
            console.error("Erro ao deletar:", error);
            throw error;
        } finally {
            connection.release();
        }
    }
}


export default TurmaRepository;