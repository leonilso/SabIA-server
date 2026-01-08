/**
 * Middleware de tratamento de erros.
 * Ele captura qualquer erro passado pelo 'next(error)' nos controladores.
 */
function errorHandler(err, req, res, next) {
  console.error('ERRO DETECTADO:', err.stack);

  // Pega o status code do erro, se existir, ou define 500 (Internal Server Error)
  const statusCode = err.statusCode || 500;
  
  // Pega a mensagem do erro
  const message = err.message || 'Ocorreu um erro interno no servidor.';

  // Retorna uma resposta JSON padronizada para o cliente
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: message,
    // (Opcional, apenas em desenvolvimento):
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

export default errorHandler;