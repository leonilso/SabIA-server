// src/services/prova.service.js
import alunoRepository from '../repositories/aluno.repository.js';
import provaRepository from '../repositories/prova.repository.js';
import aiService from './ai.service.js';
import pdfService from './pdf.service.js';

class ProvaService {
  async orquestrarGeracaoProvas(dadosInput) {
    const {
      ID,
      QTD_provas,
      QTD_questoes,
      ID_turma,
      nome_turma,
      disciplina,
      temas,
      pdfBuffer,
      imprimirGabarito
    } = dadosInput;


    const turma = {
      nome_turma,
      disciplina,
      temas
    }

    // 1. Buscar alunos e suas preferências
    const alunos = await alunoRepository.findByTurma(ID_turma);
    console.log(`Encontrados ${alunos.length} alunos para a turma ${ID_turma}.`);

    const provasGeradas = [];

    // 2. Gerar provas personalizadas para cada aluno
    let provaGerada = await provaRepository.selecionarQuestaoPorIdProjeto(ID);
    if (!provaGerada) {
      // Personalizadas
      for (const aluno of alunos) {
        const promptPersonalizado = this.construirPromptPersonalizado(
          aluno,
          QTD_questoes,
          disciplina,
          temas,
          pdfBuffer
        );

        const questoesJson = await aiService.gerarQuestoes(promptPersonalizado, pdfBuffer);

        provasGeradas.push({
          idProjeto: ID,
          tipo: 'personalizada',
          aluno,
          turma,
          questoes: questoesJson
        });
      }

      // Padrão
      const numProvasPadrao = QTD_provas - alunos.length;

      if (numProvasPadrao > 0) {
        const promptPadrao = this.construirPromptPadrao(
          QTD_questoes,
          disciplina,
          temas,
          pdfBuffer
        );

        const questoesJson = await aiService.gerarQuestoes(promptPadrao, pdfBuffer);

        provasGeradas.push({
          idProjeto: ID,
          tipo: 'padrao',
          aluno: { "ID_aluno": 0, nome: "" },
          turma,
          questoes: questoesJson
        });

        console.log('Salvando provas no banco de dados...');
        const projetoId = await provaRepository.salvarProvasEmLote(
          ID,
          provasGeradas
        );
        console.log(`Provas salvas sob o projeto ID: ${projetoId}`);

        // // Preenchendo objeto com provas padrão
        // for (let i = 1; i < numProvasPadrao; i++) {
        //   provasGeradas.push({
        //     idProjeto: ID,
        //     tipo: 'padrao',
        //     aluno: { "ID_aluno": 0, nome: "" },
        //     turma,
        //     questoes: questoesJson
        //   });
        // }
      } else {
        console.log('Salvando provas no banco de dados...');
        const projetoId = await provaRepository.salvarProvasEmLote(
          ID,
          provasGeradas
        );
        console.log(`Provas salvas sob o projeto ID: ${projetoId}`);
      }
    }

    // const { questoes } = provaGerada;

    // // 🔹 Agrupa por aluno (null = prova padrão)
    // const questoesPorAluno = {};
    // const questoesPadrao = [];

    // for (const q of questoes) {
    //   if (q.ID_aluno) {
    //     if (!questoesPorAluno[q.ID_aluno]) {
    //       questoesPorAluno[q.ID_aluno] = [];
    //     }
    //     questoesPorAluno[q.ID_aluno].push(q);
    //   } else {
    //     questoesPadrao.push(q);
    //   }
    // }


    // ===============================
    // 2️⃣ Provas personalizadas
    // ===============================
    const alunosSemQuestoes = await provaRepository.pegarAlunoSemQuestoes(ID, alunos);

    for (const aluno of alunos) {
      // const questoesAluno = questoesPorAluno[aluno.ID_aluno];
      // // ✔ Já existe prova personalizada
      // if (questoesAluno && questoesAluno.length > 0) {
      //   provasGeradas.push({
      //     idProjeto: ID,
      //     tipo: 'personalizada',
      //     aluno,
      //     turma,
      //     questoes: questoesAluno
      //   });
      // }


      // ❌ Não existe → gera com IA

      if (alunosSemQuestoes.includes(aluno.ID_aluno)) {
        const promptPersonalizado = this.construirPromptPersonalizado(
          aluno,
          QTD_questoes,
          disciplina,
          temas,
          pdfBuffer
        );

        const questoesJson = await aiService.gerarQuestoes(promptPersonalizado, pdfBuffer);

        provasGeradas.push({
          idProjeto: ID,
          tipo: 'personalizada',
          aluno,
          turma,
          questoes: questoesJson
        });

        // (opcional) salvar no banco aqui
        await provaRepository.salvarQuestoes(questoesJson, ID, aluno.ID_aluno);
      }
    }

    const provasConsultadas = [];
    const provaConsultada = await provaRepository.selecionarQuestaoPorIdProjeto(ID);
    const { questoes } = provaConsultada;

    // 🔹 Agrupa por aluno (null = prova padrão)
    const questoesPorAluno = {};
    const questoesPadrao = [];

    for (const q of questoes) {
      if (q.ID_aluno) {
        if (!questoesPorAluno[q.ID_aluno]) {
          questoesPorAluno[q.ID_aluno] = [];
        }
        questoesPorAluno[q.ID_aluno].push(q);
      } else {
        questoesPadrao.push(q);
      }
    }


    for (const aluno of alunos) {
      // console.log(aluno)
      const questoesAluno = questoesPorAluno[aluno.ID_aluno];
      provasConsultadas.push({
        idProjeto: ID,
        tipo: 'personalizada',
        aluno,
        turma,
        questoes: questoesAluno
      });
    }

    const provasPadraoNecessarias = QTD_provas - alunos.length;


    // ✔ Reaproveita provas padrão existentes
    for (let i = 0; i < provasPadraoNecessarias; i++) {
      if (questoesPadrao.length > 0) {
        provasConsultadas.push({
          idProjeto: ID,
          tipo: 'padrao',
          aluno: { "ID_aluno": 0, nome: "" },
          turma,
          questoes: questoesPadrao
        });
      }
    }

    // console.log(provasConsultadas)



    // 5. Gerar o PDF final com todas as provas
    const pdfBufferFinal = await pdfService.gerarPdfProvas(provasConsultadas, imprimirGabarito);

    return pdfBufferFinal;
  }

  // --- Funções Auxiliares de Prompt ---

  construirPromptPersonalizado(aluno, totalQuestoes, disciplina, temas, pdf) {
    // Lógica para criar o prompt para a IA
    let prompt = `Gere ${totalQuestoes} questões sobre a disciplinas de ${disciplina} nos conteúdos de ${temas}.
    O aluno gosta de ${aluno.tematica}.
    Distribuição: ${aluno.questoes_objetivas} objetiva, ${aluno.questoes_descritivas} descritiva, ${aluno.questoes_associativas} associativa.
    ${aluno.dica ? "Adaptações: Insira algumas dicas nas questões" : ""}
    ${pdf ? 'Use este conteúdo: PDF ANEXADO' : ''}`
    return prompt;
  }

  construirPromptPadrao(totalQuestoes, disciplina, temas, pdf) {
    // Lógica para criar o prompt padrão
    let prompt = `Gere ${totalQuestoes} questões sobre ${disciplina}  nos conteúdos de ${temas}.
    Temas gerais: ${temas.join(', ')}.
    Distribuição proporcional: 33% objetivas, 33% descritivas, 33% associativas.
    ${pdf ? 'Use este conteúdo: PDF ANEXADO' : ''}`
    return prompt;
  }
}

export default new ProvaService();