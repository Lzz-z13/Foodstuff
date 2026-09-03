module.exports = function errorHandler(error, req, res, next) {
  console.error(error);

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      error: true,
      message: "Payload muito grande. Limite máximo excedido."
    });
  }

  return res.status(error.status || 500).json({
    error: true,
    message: error.message || "Erro interno do servidor.",
  });
}