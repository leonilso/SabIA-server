import path from "path";
import { randomUUID } from "crypto";
import { ensureDir, saveFile } from "../utils/storage.js";
import MaterialRepository from "../repositories/material.repository.js";
import fs from "fs/promises";
import ProjetoRepository from "../repositories/projeto.repository.js";

export default class MaterialService {
  static async upload({ buffer, originalName, mimeType, size }, { projetoId }) {
    if (mimeType !== "application/pdf") {
      throw new Error("Formato inválido. Apenas PDF.");
    }

    const ano = new Date().getFullYear();
    const basePath = process.env.STORAGE_PATH || "storage/pdfs";
    const pastaAno = path.resolve(basePath, String(ano));

    ensureDir(pastaAno);

    const publicId = randomUUID();
    const fileName = `${publicId}.pdf`;
    const fullPath = path.join(pastaAno, fileName);

    saveFile(buffer, fullPath);

    await MaterialRepository.create({
      publicId,
      projetoId,
      fileName,
      pathArquivo: fullPath,
      nomeArquivo: originalName,
      mimeType,
      tamanhoBytes: size
    });

    return { publicId };
  }

  // async findByProjetoId(projetoId) {
  //   const [rows] = await db.execute(
  //     `SELECT * FROM materiais WHERE projeto_id = ?`,
  //     [projetoId]
  //   );
  //   return rows[0] || null;
  // }

  static async fileExists(path) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
    }

  static async getPdfByProjetoId(projetoId) {
    const material = await MaterialRepository.findByProjetoId(projetoId);

    if (!material) {
      console.log("Material não encontrado para este projeto");
      return;
    }

    if (!this.fileExists(material.path_arquivo)) {
      console.log("Arquivo PDF não encontrado no storage");
      return;
    }

    const buffer = await fs.readFile(material.path_arquivo);

    return {
      buffer,
      nomeArquivo: material.nome_arquivo,
      mimeType: material.mime_type,
      tamanhoBytes: material.tamanho_bytes
    };
  }
  static async deleteByProjetoId(projetoId) {
    // 1. Busca metadados
    const material = await MaterialRepository.findByProjetoId(projetoId);

    if (!material) {
      return; // ou throw new Error("Material não encontrado");
    }

    // 2. Remove arquivo físico
    try {
      await fs.unlink(material.path_arquivo);
    } catch (err) {
      // Se o arquivo já não existir, não quebra o sistema
      if (err.code !== "ENOENT") {
        throw new Error("Erro ao excluir arquivo do storage");
      }
    }

    // 3. Remove registro do banco
    await MaterialRepository.deleteByProjetoId(projetoId);
  }
  static async deleteByUserId(userId) {
    const materials = await MaterialRepository.findByUserId(userId);

        if (!materials.length) {
      return; // ou throw new Error("Material não encontrado");
    }
    materials.forEach(async (item) => {
          try {
      await fs.unlink(item.path_arquivo);
    } catch (err) {
      // Se o arquivo já não existir, não quebra o sistema
      if (err.code !== "ENOENT") {
        throw new Error("Erro ao excluir arquivo do storage");
      }
    }
    });
          await MaterialRepository.deleteByUserId(userId);
  }
}
