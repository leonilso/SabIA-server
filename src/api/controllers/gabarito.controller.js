import fs from 'fs';
import path from 'path';
import gabaritoService from '../../services/gabarito.service.js';
import MapPublicId from '../../middlewares/publicId.middleware.js';

class GabaritoController{
static async corrigir (req, res){
  try {
    // multipart form: imagem (file), idProjeto, pagina, questoes, idAluno
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Imagem é obrigatória' });
    const { idProjeto, pagina, idAluno, idGabarito} = req.body;
    const realIdProjeto = MapPublicId.projetos(idProjeto)
    
    if (!idProjeto || !pagina || !idGabarito) {
      // remove arquivo temporário
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'idProjeto, pagina e idGabarito são obrigatórios' });
    }

    // chamar o service
    const resultado = await gabaritoService.corrigirGabarito({
      idProjeto: Number(realIdProjeto),
      idAluno: Number(idAluno) || null,
      pagina: Number(pagina),
      idGabarito: Number(idGabarito),
      imagemPath: file.path
    });

    // opcional: remover arquivo temporário
    try { fs.unlinkSync(file.path); } catch(e) { /* ignore */ }

    return res.json(resultado);
  } catch (err) {
    console.error('Erro controller corrigir:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};
}

export default GabaritoController;
