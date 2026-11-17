module.exports = function errorHandler(error, req, res, next) {
  if (!error.status || error.status >= 500) console.error("Erro interno na requisição.");

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      error: true,
      message: "Payload muito grande. Limite máximo excedido."
    });
  }

  return res.status(error.status || 500).json({
    error: true,
    message: error.status && error.status < 500 ? error.message : "Erro interno do servidor.",
  });
}