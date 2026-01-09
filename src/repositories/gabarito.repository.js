import { db } from '../config/database.js'; 

class GabaritoRepository {
  static _formatRow(row) {
    if (!row) return null;
    return {
      ...row,
      temas: row.temas ? row.temas.split(',') : []
    };
  }

  static async criarGabarito(projetoId, alunoId) {
    const connection = await db.getConnection();
    const idAlunoFinal = alunoId || null;

    try {
      await connection.beginTransaction();

      await connection.execute(
        `INSERT IGNORE INTO GABARITO (ID_projeto, ID_aluno) VALUES (?, ?)`,
        [projetoId, idAlunoFinal]
      );
      let rows
      if (idAlunoFinal) {
        [rows] = await connection.execute(
          `SELECT ID FROM GABARITO WHERE ID_projeto = ? AND ID_aluno = ?`,
          [projetoId, idAlunoFinal]
        );
      } else {

        [rows] = await connection.execute(
          `SELECT ID FROM GABARITO WHERE ID_projeto = ? AND ID_aluno IS NULL`,
          [projetoId]
        );
      }


      await connection.commit();
      return rows[0].ID;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async associarGabarito(
    idGabarito,
    mapa,
    mapeamentoPaginas,
    posicaoQuestoes,
    objQuestoes,
    respostasEsperadas,
    alternativasIds,
  ) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();



      // 1. numeroQuestao -> pagina
      const paginaPorQuestao = {};
      for (const [pagina, questoes] of Object.entries(mapeamentoPaginas)) {
        questoes.forEach(numero => {
          paginaPorQuestao[mapa[numero]] = Number(pagina);
        });
      }

      // 2. numeroQuestao -> tipo
      const tipoPorQuestao = {};
      objQuestoes.forEach(q => {
        tipoPorQuestao[mapa[q.id]] = q.tipo;
      });

      // 3. Agrupa bolhas por numeroQuestao (ordem preservada)
      const alternativasPorQuestao = {};
      for (const item of posicaoQuestoes) {
        const [numeroQuestao, dados] = Object.entries(item)[0];

        if (!alternativasPorQuestao[numeroQuestao]) {
          alternativasPorQuestao[numeroQuestao] = [];
        }

        alternativasPorQuestao[numeroQuestao].push({
          x: dados.x,
          y: dados.y
        });
      }

      const ALTERNATIVAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

      // 4. Insere no banco
      for (const [idQuestao, numeroQuestao] of Object.entries(mapa)) {

        let pagina = paginaPorQuestao[numeroQuestao];
        let bolhas = alternativasPorQuestao[idQuestao];

        let tipo = tipoPorQuestao[numeroQuestao];

        // if (!pagina || !bolhas || bolhas.length === 0) continue;

        // 4.1 Verifica se já existe POSICAO_GABARITO
        const [existente] = await connection.execute(
          `
        SELECT ID
        FROM POSICAO_GABARITO
        WHERE ID_gabarito = ? AND ID_questao = ?
        `,
          [idGabarito, Number(idQuestao)]
        );

        let idPosicaoGabarito;


        if (existente.length > 0) {
          // Já existe → reutiliza
          idPosicaoGabarito = existente[0].ID;
          // Atualiza dados básicos
          if (tipo == "descritiva") {
            pagina = 0
          }
          await connection.execute(
            `
          UPDATE POSICAO_GABARITO
          SET numero_questao = ?, pagina = ?
          WHERE ID = ?
          `,
            [numeroQuestao, pagina, idPosicaoGabarito]
          );

          // Remove alternativas antigas
          await connection.execute(
            `
          DELETE FROM POSICAO_ALTERNATIVA
          WHERE ID_posicao_gabarito = ?
          `,
            [idPosicaoGabarito]
          );

        } else {
          // Não existe → insere
          // 4.1 POSICAO_GABARITO
          if (tipo == "descritiva") {
            pagina = 0
          }
          const [res] = await connection.execute(
            `
        INSERT INTO POSICAO_GABARITO
          (ID_gabarito, ID_questao, numero_questao, pagina)
        VALUES (?, ?, ?, ?)
        `,
            [idGabarito, Number(idQuestao), numeroQuestao, pagina]
          );

          idPosicaoGabarito = res.insertId;
        }

        const resposta = respostasEsperadas[idQuestao]
        const alternativa_id = alternativasIds[idQuestao]



        // 4.2 POSICAO_ALTERNATIVA


        if (tipo === 'descritiva') {
          
            await connection.execute(
              `
          INSERT INTO POSICAO_ALTERNATIVA
            (ID_posicao_gabarito, alternativa, repeticao, posicao_x, posicao_y, correta, ID_alternativa)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
              [
                idPosicaoGabarito,
                null,
                null,
                null,
                null,
                true,
                alternativa_id[1]
              ]
            );
        } else {



          for (let i = 0; i < bolhas.length; i++) {

            let correta = false
            let idAlternativa;

            let alternativa, repeticao;

            if (tipo === 'objetiva') {
              alternativa = ALTERNATIVAS[i];
              repeticao = 1;
              if (ALTERNATIVAS[i] == alternativa_id[i][0]) {
                idAlternativa = alternativa_id[i][1]
              }
              if (resposta == ALTERNATIVAS[i]) {
                correta = true;
              }

            } else if (tipo === 'associativa') {
              alternativa = ALTERNATIVAS[i % 4];
              repeticao = Math.floor(i / 4) + 1;
              if (resposta[repeticao] == alternativa) {
                correta = true;
              }
              idAlternativa = alternativa_id[1]
            } else {
              continue
            }

            await connection.execute(
              `
          INSERT INTO POSICAO_ALTERNATIVA
            (ID_posicao_gabarito, alternativa, repeticao, posicao_x, posicao_y, correta, ID_alternativa)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
              [
                idPosicaoGabarito,
                alternativa,
                repeticao,
                bolhas[i].x,
                bolhas[i].y,
                correta,
                idAlternativa
              ]
            );
          }
        }
      }

      await connection.commit();
      return true;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  static async getQuestoesPorGabaritoEPagina(idGabarito, pagina) {
    const [rows] = await db.execute(
      `
    SELECT
      pg.ID               AS idPosicaoGabarito,
      pg.ID_questao       AS idQuestao,
      pg.numero_questao,
      q.tipo,
      pa.alternativa,
      pa.repeticao,
      pa.posicao_x,
      pa.posicao_y
    FROM POSICAO_GABARITO pg
    JOIN POSICAO_ALTERNATIVA pa
      ON pa.ID_posicao_gabarito = pg.ID
    JOIN QUESTOES q
      ON q.ID = pg.ID_questao
    WHERE pg.ID_gabarito = ?
      AND pg.pagina = ?
    ORDER BY pg.numero_questao, pa.repeticao, pa.alternativa
    `,
      [idGabarito, pagina]
    );

    return rows;
  }
  static async getRespostaCorretaPorQuestoes(idsQuestoes) {
    if (!idsQuestoes.length) return {};

    const placeholders = idsQuestoes.map(() => '?').join(',');

    const [rows] = await db.execute(
      `
    SELECT
      q.ID        AS idQuestao,
      q.tipo      AS tipo,
      q.ID_resposta_correta,
      pa.alternativa,
      pa.repeticao
    FROM QUESTOES q
    LEFT JOIN POSICAO_GABARITO pg 
           ON pg.ID_questao = q.ID
    LEFT JOIN POSICAO_ALTERNATIVA pa
           ON pa.ID_posicao_gabarito = pg.ID
          AND pa.correta = true
    WHERE q.ID IN (${placeholders})
    `,
      idsQuestoes
    );

    const mapa = {};
    const conteudo = {}

    for (const row of rows) {
      const { idQuestao, tipo, alternativa, repeticao, ID_resposta_correta } = row;

      // OBJETIVA
      if (tipo === 'objetiva') {
        mapa[idQuestao] = alternativa;
        conteudo[idQuestao] = {
          tipo,
          ID_resposta_correta
        }

      }

      // DESCRITIVA
      else if (tipo === 'descritiva') {
        mapa[idQuestao] = ID_resposta_correta;
        conteudo[idQuestao] = {
          tipo,
          ID_resposta_correta
        }
      }

      // ASSOCIATIVA
      else if (tipo === 'associativa') {
        if (!mapa[idQuestao]) {
          mapa[idQuestao] = {};
        }
        mapa[idQuestao][repeticao] = alternativa;
        conteudo[idQuestao] = {
          tipo,
          ID_resposta_correta
        }
      }
    }
    return { correta: mapa, conteudo: conteudo };
  }
  static async inserirRespostaAluno({
    idProjeto,
    idAluno,
    idQuestao,
    resposta,
    pagina
  }) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `
        INSERT INTO RESPOSTAS_ALUNOS
          (ID_projeto, ID_aluno, ID_questao, resposta, pagina)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          idProjeto,
          idAluno,
          idQuestao,
          resposta !== undefined ? String(resposta) : null,
          pagina
        ]
      );

      await connection.commit();
      return true;

    } catch (error) {
      await connection.rollback();
      throw error;

    } finally {
      connection.release();
    }
  }

}

export default GabaritoRepository;