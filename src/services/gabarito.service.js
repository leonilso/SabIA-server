import { spawn } from 'child_process';
import path from 'path';
import GabaritoRepository from '../repositories/gabarito.repository.js';
import provaRepository from '../repositories/prova.repository.js';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


class GabaritoService {
static async corrigirGabarito({
  idProjeto,
  idAluno,
  idGabarito,
  pagina,
  imagemPath
}) {

  // 1. Busca tudo do banco
  const linhas = await GabaritoRepository.getQuestoesPorGabaritoEPagina(
    idGabarito,
    pagina
  );

  // console.log(linhas);

  if (!linhas.length) {
    throw new Error('Nenhuma questão encontrada para essa página');
  }

  // 2. Monta estrutura esperada pelo OMR
  const questoesMap = {};

  for (const row of linhas) {
    const key = row.numero_questao;

    if (!questoesMap[key]) {
      questoesMap[key] = {
        idQuestao: row.idQuestao,
        tipo: row.tipo,
        alternativas: []
      };
    }

    questoesMap[key].alternativas.push({
      alternativa: row.alternativa,
      repeticao: row.repeticao,
      x: row.posicao_x,
      y: row.posicao_y
    });
  }

  const questoesOMR = Object.entries(questoesMap).map(
    ([numeroQuestao, dados]) => ({
      numeroQuestao: Number(numeroQuestao),
      idQuestao: dados.idQuestao,
      tipo: dados.tipo,
      alternativas: dados.alternativas
    })
  );

  // 3. Chama OMR
  // const image = path.resolve(__dirname, "../tests/images/associativas.png")
  const detected = await this.detectAnswers(imagemPath, questoesOMR);



  // 4. Correção
  let acertos = 0;
  let totalAuto = 0;
  const detalhes = [];

  for (const q of questoesOMR) {
    if (q.tipo === 'descritiva') {
      detalhes.push({
        idQuestao: q.idQuestao,
        numeroQuestao: q.numeroQuestao,
        tipo: q.tipo,
        detectada: null,
        correta: null,
        auto: false
      });
      continue;
    }

    totalAuto++;

    const detectada = detected[q.idQuestao] ?? null;
    const {correta, conteudo} = await GabaritoRepository.getRespostaCorretaPorQuestoes([q.idQuestao]);
    console.log(correta);
    console.log(detectada)
    let acertou
    if(q.tipo == 'objetiva'){
      acertou =
      detectada &&
      correta &&
      String(detectada).toUpperCase() === String(correta[q.idQuestao]).toUpperCase();
    } else if (q.tipo == 'associativa'){
      // console.log(correta[q.idQuestao])
      let soma = 0
      for(let i = 1; i < Object.keys(correta[q.idQuestao]).length + 1; i++){
        // console.log(correta[q.idQuestao][i] == detectada[i])
        if(correta[q.idQuestao][i] == detectada[i]){
          soma++
        }
      }
      if(soma == Object.keys(correta[q.idQuestao]).length){
        acertou = true
      }
      
    }


    if (acertou) acertos++;

    detalhes.push({
      idQuestao: q.idQuestao,
      numeroQuestao: q.numeroQuestao,
      tipo: q.tipo,
      detectada,
      correta: correta[q.idQuestao],
      acertou,
      auto: true
    });

    // await GabaritoRepository.inserirRespostaAluno({
    //   idProjeto,
    //   idAluno,
    //   idQuestao: q.idQuestao,
    //   resposta: JSON.stringify(detectada),
    //   pagina
    // });
  }

  const nota = totalAuto ? (acertos / totalAuto) * 10 : null;

  const infoQuestoes = await provaRepository.selecionarQuestoesPorGabaritoPagina(idGabarito, pagina)

  return {
    sucesso: true,
    idProjeto,
    idAluno,
    pagina,
    nota,
    acertos,
    totalAuto,
    detalhes,
    infoQuestoes
  };
}



static async detectAnswers(imagePath, questoesArr) {
  return new Promise((resolve, reject) => {
    const payload = {
      imagePath,
      questoes: questoesArr
    };
    // console.log(payload.questoes)
    const py = spawn('python', [
      path.resolve(__dirname, '../omr/omr_processor.py'),
      JSON.stringify(payload)
    ]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', data => {
      stdout += data.toString();
    });

    py.stderr.on('data', data => {
      stderr += data.toString();
    });

    py.on('close', code => {
      if (code !== 0) {
        console.error('OMR stderr:', stderr);
        return reject(new Error('Erro no OMR'));
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (err) {
        reject(new Error('JSON inválido retornado pelo OMR'));
      }
    });
  });
}
}

export default GabaritoService