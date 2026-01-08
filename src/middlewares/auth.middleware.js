import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js';

class AuthMiddleware {
  static authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const [, token] = authHeader.split(' ');

    try {
      const decoded = jwt.verify(token, authConfig.jwtSecret);
      req.usuario = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  }
  static premium(req, res, next) {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!req.usuario.statusAssinatura) {
      return res.status(403).json({ error: 'Acesso premium necessário' });
    }

    return next();
  }
}

export default AuthMiddleware;
