// src/services/pdf.service.js

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import provaRepository from '../repositories/prova.repository.js';
import GabaritoRepository from '../repositories/gabarito.repository.js';
import seedrandom  from "seedrandom";

// Dimensões para normalização (Escala do Python)
const OMR_WIDTH = 800;
const OMR_HEIGHT = 1100;
// Dimensões padrão do PDFKit (A4 em pontos)
const PDF_WIDTH = 595.28; 
const PDF_HEIGHT = 841.89;

class PdfService {
  /**
   * Gera um único arquivo PDF contendo todas as provas.
   * @param {Array<Object>} provasGeradas - O array de provas (com questoes)
   * @returns {Promise<Buffer>} - Uma promessa que resolve para o Buffer do PDF
   */
  async gerarPdfProvas(provasGeradas, imprimirGabarito) {
    // Retornamos uma promessa para que o service principal possa usar await
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50, // Margem de 50px (aprox 1.76cm)
          autoFirstPage: false, // Vamos adicionar a primeira página manualmente
          size: 'A4'
        });
        // --- Configuração do Buffer ---
        // O PDF será escrito em memória. Vamos coletar os "chunks" de dados.
        const buffers = [];
        doc.on('data', (chunk) => {
          buffers.push(chunk);
        });

        // Quando o PDF terminar de ser gerado, juntamos os chunks
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Caso ocorra um erro
        doc.on('error', (err) => {
          reject(err);
        });

        // --- Geração do Conteúdo do PDF ---

        let provaGlobalIndex = 1;

        for (const prova of provasGeradas) {
          // Adiciona uma nova página para CADA prova
          doc.addPage();

          let fontSize = prova.aluno.auxilio_visao ? 18 : 14
          // 1. Cabeçalho da Prova
          this.adicionarCabecalho(doc, prova, provaGlobalIndex++);

          // 2. Iterar e adicionar as questões
          let mapeamento = []
          let respostasEsperadas = {}
          let questaoIndex = 1;
          let alternativasIds = {}
          for (const questao of prova.questoes) {
            const { idRealIdProva, respostaEsperada, alternativaId } = this.adicionarQuestao(doc, questao, questaoIndex++, fontSize);
            mapeamento.push(idRealIdProva);
            respostasEsperadas = { ...respostasEsperadas, ...respostaEsperada};
            alternativasIds = { ...alternativasIds, ...alternativaId};
          }

            await this.adicionarCartaoResposta(doc, prova, mapeamento, respostasEsperadas, alternativasIds, imprimirGabarito);
        }

        // Finaliza o documento (isso dispara o evento 'end')
        doc.end();
      } catch (error) {
        console.error('Erro ao gerar o PDF:', error);
        reject(error);
      }
    });
  }

  // --- Funções Auxiliares de Formatação ---

  /**
   * Adiciona o cabeçalho de uma prova específica
   */
  adicionarCabecalho(doc, prova, index) {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(`PROVA ${index}`, { align: 'center' });

    doc.moveDown(0.5);

    if (prova.tipo === 'personalizada' && prova.aluno) {
      doc
        .fontSize(14)
        .font('Helvetica')
        .text(`Aluno: ${prova.aluno.nome}`);

      doc.fontSize(12).text(`Temática: ${prova.aluno.tematica}`);
      if (prova.aluno.dica) doc.text('Adaptações: Inclui Dicas');
      if (prova.aluno.auxilio_visao) doc.text('Adaptações: Auxílio Visual');
      doc.text(`Turma: ${prova.turma.nome_turma}`);
      doc.text(`Disciplina: ${prova.turma.disciplina}`);
      let temasText = ""
      prova.turma.temas.forEach(tema => {
        temasText = temasText + "#" + tema + " "
      });
      doc.text(`Temas: ${temasText}`);

    } else {
      doc
        .fontSize(14)
        .font('Helvetica')
        .text('Nome: ______________________________________');
      doc.text(`Turma: ${prova.turma.nome_turma}`);
      doc.text(`Disciplina: ${prova.turma.disciplina}`);
    }

    // Linha horizontal
    doc.moveDown(1);
    doc.strokeColor('black').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(2);
  }

  /**
   * Adiciona uma única questão (e seus tipos de resposta) ao documento
   */
  adicionarQuestao(doc, questao, index, fontSize) {
    // Enunciado
    doc
      .fontSize(fontSize)
      .font('Helvetica-Bold')
      .text(`${index}. ${questao.pergunta}`, 50);

    doc.fontSize(fontSize).font('Helvetica');

    // Formatar com base no tipo de resposta

    let respostaEsperada = {}
    let alternativaID = {}
    const questaoId = questao.id
    // CENÁRIO 1: Objetiva (Múltipla Escolha)
    if (Array.isArray(questao.respostas)) {
      const opcoes = ['A', 'B', 'C', 'D', 'E']; // Suporta até 5 alternativas
      questao.respostas.forEach((resposta, i) => {
        doc.text(`( ${opcoes[i]} ) ${resposta}`);
        if(i==questao.correta){
          respostaEsperada[questaoId] = opcoes[i];
        }
        alternativaID[questaoId] = alternativaID[questaoId] || []
        alternativaID[questaoId].push([opcoes[i], questao.listaIdsRespostas[i]]);
      });

      // CENÁRIO 2: Descritiva (Gabarito é uma string)
    } else if (typeof questao.respostas === 'string') {
      doc.moveDown(fontSize * 0.06);
      doc.strokeColor('black').lineWidth(0.5).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(fontSize * 0.06);
      doc.strokeColor('black').lineWidth(0.5).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(fontSize * 0.06);
      doc.strokeColor('black').lineWidth(0.5).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      respostaEsperada[questaoId] = questao.respostas;
      alternativaID[questaoId] = [questao.respostas, questao.idResposta]



      // CENÁRIO 3: Associativa (Gabarito é um objeto)
    } else if (typeof questao.respostas === 'object' && questao.respostas !== null) {
      const opcoes = ['A', 'B', 'C', 'D', 'E'];
      doc.moveDown(fontSize * 0.06);

      const coluna1 = Object.keys(questao.respostas);
      const coluna2 = Object.values(questao.respostas);
      
      const rng = seedrandom(questaoId);
      // Embaralha a coluna 2 para o exercício fazer sentido
      const coluna2Embaralhada = coluna2
        .map(value => ({ value, sort: rng() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);


      const meioPagina = 320;
      let yInicial = doc.y;

      // 1. Calcular a altura total que o bloco vai ocupar
      // (Isso assume que cada linha tem uma altura fixa ou calculável)
      const alturaEstimadaLinha = doc.currentLineHeight(); // ou um valor fixo como 15
      const alturaTotalBloco = coluna1.length * alturaEstimadaLinha;

      // 2. Verificar se ultrapassa o limite da página (ex: 750 pontos)
      if (yInicial + alturaTotalBloco > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        yInicial = doc.y; // Reseta para o topo da nova página
      }

      // 3. Agora executa o loop com a garantia de que caberá (ou quebrará de forma controlada)
      for (let i = 0; i < coluna1.length; i++) {
        // Importante: atualizar o yInicial para o y atual do doc caso tenha havido quebra automática
        if (doc.y < yInicial) {
          yInicial = doc.y;
        }

        doc.text(`(${i + 1}) ${coluna1[i]}`, 70, yInicial, { width: meioPagina - 20, align: 'left' });
        let pos1 = doc.y;

        doc.text(`(${opcoes[i]}) ${coluna2Embaralhada[i]}`, meioPagina, yInicial);
        let pos2 = doc.y;

        respostaEsperada[questaoId] = respostaEsperada[questaoId] || {}
        respostaEsperada[questaoId][i + 1] = opcoes[coluna2Embaralhada.indexOf(coluna2[i])]
        alternativaID[questaoId] = [respostaEsperada[questaoId], questao.idResposta]
        

        // Define o y da próxima linha baseado no maior crescimento
        yInicial = Math.max(pos1, pos2);
      }
      
    }

    doc.moveDown(fontSize * 0.06); // Espaço entre as questões
    // doc.moveTo(doc.y)
    const idRealIdProva = {idQuestao: questao.id, idProva: index}
    return {idRealIdProva: idRealIdProva, respostaEsperada: respostaEsperada, alternativaId: alternativaID}
  }
  desenharAncoras(doc) {
    const size = 30;
    const m = 20;
    const w = doc.page.width;
    
    const h = doc.page.height;

    doc.rect(m, m, size, size).fill('black');
    doc.rect(w - m - size, m, size, size).fill('black');
    doc.rect(m, h - m - size, size, size).fill('black');
    doc.rect(w - m - size, h - m - size, size, size).fill('black');

    doc.fillColor('black');
  }
  async desenharQR(doc, prova, pagina, gabarito) {
    try {
      // 1. Defina a URL base do seu sistema de correção/validação
      const baseUrl = `${process.env.FRONT_URL}/corrigir`;


      // 3. Monta a URL com os parâmetros de busca (Query Params)
      const params = new URLSearchParams({
        g: gabarito,
        p: prova.idProjeto,
        a: prova.aluno?.ID_aluno || 0,
        pg: pagina // Incluindo o número da página
      });

      const urlFinal = `${baseUrl}?${params.toString()}`;
      // console.log(urlFinal)

      // 4. Gera o QR Code a partir da URL
      const qrBuffer = await QRCode.toBuffer(urlFinal, { 
        type: 'png',
        errorCorrectionLevel: 'L', // Nível 'L' é ideal para URLs longas
        margin: 2
      });

      // 5. Desenha no PDF nas coordenadas que você definiu
      // Como você usa coordenadas fixas (400, 600), a imagem não "empurra" o texto automaticamente
      doc.image(qrBuffer, 425, 590, { width: 100 });

      // Opcional: Se você quiser que o PDFKit saiba que essa área está ocupada:
      // doc.y = 600 + 150 + 10; 

    } catch (error) {
      console.error("Erro ao gerar QR Code Link:", error);
      doc.fontSize(10).text("Erro ao gerar QR", 400, 600);
    }
  }

  async adicionarCartaoResposta(doc, prova, mapeamento, respostasEsperadas, alternativasIds, imprimirGabarito) {
    if(imprimirGabarito){


    doc.addPage();
    const mapa = Object.fromEntries(
      mapeamento.map(item => [item.idQuestao, item.idProva])
    );
    const idGabarito = await GabaritoRepository.criarGabarito(prova.idProjeto, prova.aluno.ID_aluno)

    // 🔹 Âncoras visuais
    this.desenharAncoras(doc);

    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('CARTÃO-RESPOSTA', { align: 'left' });

    doc.moveDown(1);
    let page = 1;
    await this.desenharQR(doc, prova, page, idGabarito);

    let mapeamentoPaginas = {};
    let posicaoQuestoes = [];

    // ============================
    // QUESTÕES OBJETIVAS
    // ============================
    doc.font('Helvetica-Bold').text('QUESTÕES OBJETIVAS');
    doc.moveDown(0.5);
    doc.font('Helvetica');

    const questoesObj = prova.questoes.filter(q => q.tipo === 'objetiva');
    

    let xInicial = 60;
    let yInicial = doc.y;
    let x = xInicial;
    let y = yInicial;

    const larguraColuna = 64;
    const alturaLinha = 22;

    for (const q of questoesObj) {
      // quebra de coluna
      if (x + larguraColuna > doc.page.width - 60) {
        x = xInicial;
        y += (q.respostas.length + 1) * alturaLinha + 10;
      }


      // quebra de página
      if (y + (q.respostas.length + 1) * alturaLinha > doc.page.height - 80) {
        doc.addPage();
        page++
        await this.desenharQR(doc, prova, page, idGabarito);
        this.desenharAncoras(doc);
        y = 100;
        x = xInicial;
      }

      // número da questão
      doc.rect(x, y, 38, 18).stroke();
      doc.text(`${mapa[q.id]}`, x, y + 4, { width: 38, align: 'center' });
      (mapeamentoPaginas[page] ??= []).push(q.id);

      let yOp = y + 24;

      ['A', 'B', 'C', 'D', 'E']
        .slice(0, q.respostas.length)
        .forEach(op => {
          doc.circle(x + 10, yOp + 6, 6).stroke();
          posicaoQuestoes.push(this.pegarCoordenada(q.id, x + 10, yOp + 6))
          doc.text(op, x + 24, yOp);
          yOp += alturaLinha;
        });

      x += larguraColuna;
    }

    // ============================
    // QUESTÕES ASSOCIATIVAS
    // ============================
    doc.addPage();
    page++
    this.desenharAncoras(doc);
    await this.desenharQR(doc, prova, page, idGabarito);

    doc.font('Helvetica-Bold')
      .text('QUESTÕES ASSOCIATIVAS', 60, 80);

    doc.font('Helvetica');

    let yAssoc = 120;
    const questoesAssoc = prova.questoes.filter(q => q.tipo === 'associativa');
    let contador = 0;
    for (const q of questoesAssoc) {
      doc.text(`Questão ${mapa[q.id]}`, 60, yAssoc - 20);
      (mapeamentoPaginas[page] ??= []).push(q.id);

      let xAssoc = 60;
      let sub = 1;

      for (const _ of Object.keys(q.respostas)) {
        doc.text(`${mapa[q.id]}.${sub}`, xAssoc, yAssoc);

        let yBolha = yAssoc + 14;
        ['A', 'B', 'C', 'D'].forEach(op => {
          doc.circle(xAssoc + 10, yBolha + 6, 6).stroke();
          posicaoQuestoes.push(this.pegarCoordenada(q.id, xAssoc + 10, yBolha + 6))
          doc.text(op, xAssoc + 24, yBolha);
          yBolha += 20;
        });

        xAssoc += 80;
        sub++;
      }

      yAssoc += 120;
      contador++
      if (yAssoc > doc.page.height - 100 && contador < questoesAssoc.length) {
        doc.addPage();
        page++
        await this.desenharQR(doc, prova, page, idGabarito);
        this.desenharAncoras(doc);
        yAssoc = 120;
      }
    }
    await GabaritoRepository.associarGabarito(idGabarito, mapa, mapeamentoPaginas, posicaoQuestoes, prova.questoes, respostasEsperadas, alternativasIds)
    // await provaRepository.associarPaginaGabarito(mapeamentoPaginas, mapa, prova.idProjeto)
        } else {
    const mapa = Object.fromEntries(
      mapeamento.map(item => [item.idQuestao, item.idProva])
    );
    const idGabarito = await GabaritoRepository.criarGabarito(prova.idProjeto, prova.aluno.ID_aluno)

    let page = 1;


    let mapeamentoPaginas = {};
    let posicaoQuestoes = [];

    // ============================
    // QUESTÕES OBJETIVAS
    // ============================

    const questoesObj = prova.questoes.filter(q => q.tipo === 'objetiva');
    

    let xInicial = 60;
    let yInicial = doc.y;
    let x = xInicial;
    let y = yInicial;

    const larguraColuna = 64;
    const alturaLinha = 22;

    for (const q of questoesObj) {
      // quebra de coluna
      if (x + larguraColuna > doc.page.width - 60) {
        x = xInicial;
        y += (q.respostas.length + 1) * alturaLinha + 10;
      }


      // quebra de página
      if (y + (q.respostas.length + 1) * alturaLinha > doc.page.height - 80) {
        page++
        y = 100;
        x = xInicial;
      }

      // número da questão
      (mapeamentoPaginas[page] ??= []).push(q.id);

      let yOp = y + 24;

      ['A', 'B', 'C', 'D', 'E']
        .slice(0, q.respostas.length)
        .forEach(op => {
          posicaoQuestoes.push(this.pegarCoordenada(q.id, x + 10, yOp + 6))
          yOp += alturaLinha;
        });

      x += larguraColuna;
    }

    // ============================
    // QUESTÕES ASSOCIATIVAS
    // ============================
    page++

    let yAssoc = 120;
    const questoesAssoc = prova.questoes.filter(q => q.tipo === 'associativa');
    let contador = 0;
    for (const q of questoesAssoc) {
      (mapeamentoPaginas[page] ??= []).push(q.id);

      let xAssoc = 60;
      let sub = 1;

      for (const _ of Object.keys(q.respostas)) {

        let yBolha = yAssoc + 14;
        ['A', 'B', 'C', 'D'].forEach(op => {
          posicaoQuestoes.push(this.pegarCoordenada(q.id, xAssoc + 10, yBolha + 6))
          yBolha += 20;
        });

        xAssoc += 80;
        sub++;
      }

      yAssoc += 120;
      contador++
      if (yAssoc > doc.page.height - 100 && contador < questoesAssoc.length) {
        page++
        yAssoc = 120;
      }
    }
    await GabaritoRepository.associarGabarito(idGabarito, mapa, mapeamentoPaginas, posicaoQuestoes, prova.questoes, respostasEsperadas, alternativasIds)
        }
  }
  pegarCoordenada(id, x, y) {
    const obj = {};
    const posX = x;
    const posY = y;
    obj[id] = {
      x: posX,
      y: posY
    }
    return obj;
  }
}

export default new PdfService();