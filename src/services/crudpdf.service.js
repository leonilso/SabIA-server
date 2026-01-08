import fs from "fs/promises";
import path from "path";
import ProjetoRepository from "../repositories/projeto.repository.js";


class CrudPDF {
static async salvarPdfProjeto(projetoId, imprimirGabarito, pdfBuffer) {
  const basePath = path.join(
    process.env.STORAGE_PATH,
    "pdfs",
    "projetos",
    String(projetoId)
  );

  await fs.mkdir(basePath, { recursive: true });

  const nomeArquivo = imprimirGabarito
    ? "prova_gabarito.pdf"
    : "prova.pdf";

  const filePath = path.join(basePath, nomeArquivo);

  await fs.writeFile(filePath, pdfBuffer);

  return filePath;
}
static async getPdfPath(projetoId, imprimirGabarito) {
  const basePath = path.join(
    process.env.STORAGE_PATH,
    "pdfs",
    "projetos",
    String(projetoId)
  );

  await fs.mkdir(basePath, { recursive: true });

  const nomeArquivo = imprimirGabarito
    ? "prova_gabarito.pdf"
    : "prova.pdf";

  const filePath = path.join(basePath, nomeArquivo);

  return filePath;
}

static async apagarPdfsProjeto(projetoId) {
  const dir = path.join(
    process.env.STORAGE_PATH,
    "pdfs",
    "projetos",
    String(projetoId)
  );

  await fs.rm(dir, { recursive: true, force: true });
}

static async apagarPdfsTurma(turmaId) {
  const idsProjetos = await ProjetoRepository.pegarIdsPelaTurma(turmaId)
  idsProjetos.map( async (item) => {
      const dir = path.join(
    process.env.STORAGE_PATH,
    "pdfs",
    "projetos",
    String(item.public_id)
  );

  await fs.rm(dir, { recursive: true, force: true });
  })

}

static async apagarPdfsUsuario(userId) {
  const idsProjetos = await ProjetoRepository.pegarIdsPeloUser(userId)
  idsProjetos.map( async (item) => {
      const dir = path.join(
    process.env.STORAGE_PATH,
    "pdfs",
    "projetos",
    String(item.public_id)
  );

  await fs.rm(dir, { recursive: true, force: true });
  })

}

}

export default CrudPDF;
