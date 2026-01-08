// src/repositories/prova.repository.js
import { db } from '../config/database.js'; 
class ProvaRepository {
  temEstruturaJson(texto) {
    return texto.includes("{") && texto.includes(":");
  }
  /**
   * Salva todo o projeto, questões e respostas dentro de uma transação.
   * 
   * 
   */

  async selecionarQuestaoPorIdProjeto(ID_projeto) {
    // console.log(ID_projeto)
    try {
      const [rows] = await db.execute(
        `
      SELECT
        q.ID            AS questao_id,
        q.ID_projeto,
        q.ID_aluno,
        q.tipo,
        q.enunciado,
        q.ID_resposta_correta,
        r.ID  AS resposta_id,
        r.conteudo_resposta
      FROM Questoes q
      LEFT JOIN Respostas r ON r.ID_questao = q.ID
      WHERE q.ID_projeto = ?
      ORDER BY q.ID, r.ID
      `,
        [ID_projeto]
      );


      // console.log(rows)
      if (rows.length === 0) return null;

      // ===============================
      // Reconstrução do JSON
      // ===============================
      const resultado = {
        projeto_id: ID_projeto,
        questoes: []
      };

      const mapaQuestoes = new Map();
      let questao;
      for (const row of rows) {
        
        if (!mapaQuestoes.has(row.questao_id)) {
          questao = {
            id: row.questao_id,
            ID_aluno: row.ID_aluno,
            tipo: row.tipo,
            idResposta: row.ID_resposta_correta,
            pergunta: row.enunciado,
          };
          switch (row.tipo) {
            case "descritiva":
              questao.respostas = row.conteudo_resposta;
              break;
            case "associativa":
              questao.respostas = JSON.parse(row.conteudo_resposta);
              break
            case "objetiva":
              // console.log(row)
              if (row.ID_resposta_correta == row.resposta_id) {
                const [respostas] = await db.execute(
                  `SELECT conteudo_resposta, ID FROM respostas WHERE ID_questao = ?`,
                  [questao.id]
                );
                const listaRespostas = respostas.map(item => item.conteudo_resposta);
                const listaIdsRespostas = respostas.map(item => item.ID);
                questao.respostas = listaRespostas
                questao.listaIdsRespostas = listaIdsRespostas
                questao.correta = listaRespostas.indexOf(row.conteudo_resposta)
              }
          }
          if (Object.keys(questao).includes("respostas")) {
            mapaQuestoes.set(row.questao_id, questao);
            resultado.questoes.push(questao);
            // if (this.temEstruturaJson(row.conteudo_resposta)) {
            //   mapaQuestoes.get(row.questao_id).respostas = JSON.parse(row.conteudo_resposta)
            // }  
          }
        }

        // // Adiciona resposta se existir
        if (row.resposta_id) {
          
        }
      }

    
      return resultado;
    } catch (error) {
      console.error('Erro na transação do banco:', error);
      throw new Error('Falha verificar questões.');
    }
  }

  async selecionarQuestoesPorGabaritoPagina(ID_gabarito, pagina) {
  try {
    const [rows] = await db.execute(
      `SELECT
  q.ID                  AS questao_id,
  q.ID_aluno,
  q.tipo,
  q.enunciado,
  q.ID_resposta_correta,

  pg.ID                 AS id_posicao_gabarito,
  pg.numero_questao,
  pg.pagina,

  pa.ID                 AS id_posicao_alternativa,
  pa.alternativa,
  pa.repeticao,
  pa.correta             AS alternativa_correta,
  pa.ID_alternativa,

  r.conteudo_resposta

FROM GABARITO g
JOIN POSICAO_GABARITO pg 
  ON pg.ID_gabarito = g.ID
JOIN Questoes q 
  ON q.ID = pg.ID_questao
LEFT JOIN POSICAO_ALTERNATIVA pa 
  ON pa.ID_posicao_gabarito = pg.ID
LEFT JOIN Respostas r
  ON r.ID = pa.ID_alternativa

WHERE g.ID = ?
  AND pg.pagina = ?

ORDER BY pg.numero_questao, pa.alternativa, pa.repeticao;`,
      [ID_gabarito, pagina]
    );

    if (!rows.length) return null;

    const resultado = {
      id_gabarito: ID_gabarito,
      pagina,
      questoes: []
    };

    const mapaQuestoes = new Map();

    for (const row of rows) {
      if (!mapaQuestoes.has(row.questao_id)) {
        const questao = {
          id: row.questao_id,
          ID_aluno: row.ID_aluno,
          tipo: row.tipo,
          pergunta: row.enunciado,
          numeroQuestao: row.numero_questao,
          pagina: row.pagina,
        };

        if (row.tipo === "objetiva") {
          questao.alternativas = [];
        }

        if (row.tipo === "associativa") {
          questao.alternativas = {};
        }

        mapaQuestoes.set(row.questao_id, questao);
        resultado.questoes.push(questao);
      }

      const questao = mapaQuestoes.get(row.questao_id);

      // =========================
      // ALTERNATIVAS
      // =========================
      if (row.id_posicao_alternativa) {
        if (row.tipo === "objetiva") {
          questao.alternativas.push({
            idPosicaoAlternativa: row.id_posicao_alternativa,
            alternativa: row.alternativa,
            idAlternativa: row.ID_alternativa,
            conteudo: row.conteudo_resposta,
            correta: !!row.alternativa_correta
          });
        }

        if (row.tipo === "associativa") {
          if (!questao.alternativas[row.repeticao]) {
            questao.alternativas[row.repeticao] = [];
          }

          questao.alternativas[row.repeticao].push({
            alternativa: row.alternativa,
            idAlternativa: row.ID_alternativa,
            conteudo: row.conteudo_resposta,
            correta: !!row.alternativa_correta
          });
        }
      }
    }

    return resultado;

  } catch (error) {
    console.error("Erro ao buscar questões:", error);
    throw new Error("Falha ao buscar questões do gabarito.");
  }
}

  async salvarProvasEmLote(ID, provasGeradas) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const projetoId = ID;

      // 2. Iterar sobre cada prova (personalizada ou padrão)
      for (const prova of provasGeradas) {
        const ID_aluno = prova.aluno.ID_aluno ? prova.aluno.ID_aluno : null
        const [existe] = await connection.execute(
          'SELECT ID_aluno FROM Questoes WHERE ID_aluno = (?)',
          [ID_aluno]
        );
        if (existe.length > 0) {
          break
        } else {
          // 'prova.questoes' é o array de JSONs que veio da IA
          for (const questaoIA of prova.questoes) {
            const [qResult] = await connection.execute(
              'INSERT INTO Questoes (enunciado, ID_projeto, tipo, ID_aluno) VALUES (?, ?, ?, ?)',
              [questaoIA.pergunta, projetoId, questaoIA.tipo, ID_aluno]
            );
            const questaoId = qResult.insertId;

            // 4. Inserir Respostas (Lógica complexa aqui)
            let idRespostaCorreta = null;

            // Exemplo de lógica para tratar os diferentes tipos de resposta da IA
            if (questaoIA.tipo == "objetiva") {
              // Múltipla Escolha
              for (const [index, respostaTexto] of questaoIA.respostas.entries()) {
                // A IA PRECISA INFORMAR QUAL É A CORRETA!
                // Assumindo que a IA envia: { "pergunta": "...", "respostas": [...], "correta": 0 }
                const [rResult] = await connection.execute(
                  'INSERT INTO Respostas (ID_questao, conteudo_resposta) VALUES (?, ?)',
                  [questaoId, respostaTexto]
                );
                if (index === questaoIA.correta) {
                  idRespostaCorreta = rResult.insertId;
                }
              }
            } else if (questaoIA.tipo == "descritiva") {
              // Descritiva (armazenamos a resposta 'gabarito')
              const [rResult] = await connection.execute(
                'INSERT INTO Respostas (ID_questao, conteudo_resposta) VALUES (?, ?)',
                [questaoId, questaoIA.respostas]
              );
              idRespostaCorreta = rResult.insertId;
            } else if (questaoIA.tipo == "associativa") {
              // Associativa (armazenamos como JSON string)
              const [rResult] = await connection.execute(
                'INSERT INTO Respostas (ID_questao, conteudo_resposta) VALUES (?, ?)',
                [questaoId, JSON.stringify(questaoIA.respostas)]
              );
              idRespostaCorreta = rResult.insertId; // A própria associação é a "resposta"
            }

            // 5. Atualizar a Questão com a Resposta Correta
            if (idRespostaCorreta) {
              await connection.execute(
                'UPDATE Questoes SET ID_resposta_correta = ? WHERE ID = ?',
                [idRespostaCorreta, questaoId]
              );
            }
          }

        }
      }

      // Se tudo deu certo, comita a transação
      await connection.commit();
      return projetoId; // Retorna o ID do projeto mestre
    } catch (error) {
      // Se algo deu errado, desfaz tudo
      await connection.rollback();
      console.error('Erro na transação do banco:', error);
      throw new Error('Falha ao salvar provas no banco de dados.');
    } finally {
      connection.release();
    }
  }
  async salvarQuestoes(questoesJson, ID, ID_aluno) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const projetoId = ID;

      for (const questaoIA of questoesJson) {
        const [qResult] = await connection.execute(
          'INSERT INTO Questoes (enunciado, ID_projeto, tipo, ID_aluno) VALUES (?, ?, ?, ?)',
          [questaoIA.pergunta, projetoId, questaoIA.tipo, ID_aluno]
        );
        const questaoId = qResult.insertId;

        // 4. Inserir Respostas (Lógica complexa aqui)
        let idRespostaCorreta = null;

        // Exemplo de lógica para tratar os diferentes tipos de resposta da IA
        if (questaoIA.tipo == "objetiva") {
          // Múltipla Escolha
          for (const [index, respostaTexto] of questaoIA.respostas.entries()) {
            // A IA PRECISA INFORMAR QUAL É A CORRETA!
            // Assumindo que a IA envia: { "pergunta": "...", "respostas": [...], "correta": 0 }
            const [rResult] = await connection.execute(
              'INSERT INTO Respostas (ID_questao, conteudo_resposta) VALUES (?, ?)',
              [questaoId, respostaTexto]
            );
            if (index === questaoIA.correta) {
              idRespostaCorreta = rResult.insertId;
            }
          }
        } else if (questaoIA.tipo == "descritiva") {
          // Descritiva (armazenamos a resposta 'gabarito')
          const [rResult] = await connection.execute(
            'INSERT INTO Respostas (ID_questao, conteudo_resposta) VALUES (?, ?)',
            [questaoId, questaoIA.respostas]
          );
          idRespostaCorreta = rResult.insertId;
        } else if (questaoIA.tipo == "associativa") {
          // Associativa (armazenamos como JSON string)
          const [rResult] = await connection.execute(
            'INSERT INTO Respostas (ID_questao, conteudo_resposta) VALUES (?, ?)',
            [questaoId, JSON.stringify(questaoIA.respostas)]
          );
          idRespostaCorreta = rResult.insertId; // A própria associação é a "resposta"
        }

        // 5. Atualizar a Questão com a Resposta Correta
        if (idRespostaCorreta) {
          await connection.execute(
            'UPDATE Questoes SET ID_resposta_correta = ? WHERE ID = ?',
            [idRespostaCorreta, questaoId]
          );
        }
      }
      await connection.commit();
      return projetoId; // Retorna o ID do projeto mestre
    } catch (error) {
      // Se algo deu errado, desfaz tudo
      await connection.rollback();
      console.error('Erro na transação do banco:', error);
      throw new Error('Falha ao salvar questão no banco de dados.');
    } finally {
      connection.release();
    }
  }
  async pegarAlunoSemQuestoes(idProjeto, listaAlunos) {
    try {
      const listaIds = listaAlunos.map(item => item.ID_aluno).filter(element => element !== undefined);

      if(listaIds.length > 0){
        const placeholders = listaIds.map(() => '?').join(',');
        const query = `SELECT ID_aluno FROM QUESTOES WHERE ID_projeto = ? AND ID_aluno IN (${placeholders})`;
  
        const [rows] = await db.execute(query, [idProjeto, ...listaIds]);
        const idsBanco = rows.map(item => item.ID_aluno);
        const foraBanco = listaIds.filter(item => !idsBanco.includes(item));
  
        return foraBanco;
      } else {
        return []
      }

    } catch (error) {
      console.error('Erro na transação do banco:', error);
      throw new Error('Falha ao pegar ids no banco de dados.');
    }


  }
  async associarPaginaQuestao(mapeamentoPaginas, idProjeto) {
    try {
      // 1. Prepara os dados no formato [[idProjeto, pagina, idQuestao], [...]]
      const values = Object.entries(mapeamentoPaginas).flatMap(([pagina, ids]) =>
        ids.map(idQuestao => [idProjeto, parseInt(pagina), idQuestao])
      );

      if (values.length === 0) return;

      // 2. Query com ON DUPLICATE KEY UPDATE
      // Se o par (ID_projeto, ID_questao) já existir, ele atualiza apenas a pagina_gabarito
      const sql = `
      INSERT INTO GABARITO (ID_projeto, pagina_gabarito, ID_questao) 
      VALUES ? 
      ON DUPLICATE KEY UPDATE pagina_gabarito = VALUES(pagina_gabarito)
    `;

      // 3. Execução (assumindo que 'db' é sua conexão/pool do mysql2)
      const [result] = await db.query(sql, [values]);

      console.log(`Sucesso: ${result.affectedRows} linhas processadas.`);

    } catch (error) {
      console.error('Erro na transação do banco:', error);
      throw new Error('Falha ao salvar ids no banco de dados.');
    }
  }
}

export default new ProvaRepository();