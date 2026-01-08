// src/services/ai.service.js

import Groq from "groq-sdk";
import { PDFParse } from 'pdf-parse';


// 1. Cliente Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Molde JSON (permanece igual)
 */
const SCHEMA_JSON_PROMPT = `
Sua resposta DEVE ser um objeto JSON, e NADA MAIS.
O objeto JSON deve ter uma única chave "questoes", que é um array.

Cada objeto no array "questoes" DEVE seguir este formato:
1. "pergunta": (string) O enunciado completo da questão.
2. "tipo": (string) Um dos três valores: "objetiva", "descritiva", "associativa".
3. "respostas":
   - Se "tipo" for "objetiva": Um array de strings com as alternativas, IMPORTANTE, a respota correta deve estar em posições diferente no array.
   - Se "tipo" for "descritiva": Uma string contendo a resposta/gabarito.
   - Se "tipo" for "associativa": Um objeto onde as chaves são a coluna A e os valores são a coluna B.
4. "correta":
   - Se "tipo" for "objetiva": O índice (número) da resposta correta no array "respostas".
   - Se "tipo" for "descritiva" ou "associativa": O valor deve ser NULO (null).
`;

class AiService {
  /**
   * Gera questões usando Groq + LLaMA 3.3
   */
  async gerarQuestoes(promptUsuario, pdfBuffer = null) {
    console.log("🤖 Groq AI Service: Iniciando chamada...");

    let textoPdf = "";

      if (pdfBuffer) {
    try {
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      let textoPdf = result.text


      // Limite de segurança (evita explodir tokens)
      textoPdf = textoPdf.slice(1000, 4000);
    } catch (err) {
      console.error("Erro ao ler PDF:", err);
      throw new Error("Falha ao processar o PDF.");
    }
  }



    let promptFinal = `
${SCHEMA_JSON_PROMPT}

${textoPdf ? `---\nCONTEÚDO DO MATERIAL (PDF):\n${textoPdf}\n` : ""}

---
PEDIDO ESPECÍFICO:
${promptUsuario}
`;

    try {
      // 2. Chamada ao modelo Groq
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "Você é um gerador de provas educacionais. Responda exclusivamente em JSON válido.",
          },
          {
            role: "user",
            content: promptFinal,
          },
        ],
        response_format: { type: "json_object" }, // 🔥 força JSON válido
      });

      const jsonString = completion.choices[0].message.content;

      console.log("🤖 Groq AI Service: Resposta JSON recebida.");

      // 3. Parse do JSON
      const jsonResponse = JSON.parse(jsonString);

      if (!jsonResponse.questoes || !Array.isArray(jsonResponse.questoes)) {
        throw new Error(
          "Formato de JSON inesperado da IA (faltando a chave 'questoes')."
        );
      }

      console.log(jsonResponse)

      return jsonResponse.questoes;
    } catch (error) {
      console.error("Erro na chamada da API da IA (Groq):", error);
      throw new Error("Falha ao comunicar com a inteligência artificial.");
    }
  }
}

export default new AiService();
