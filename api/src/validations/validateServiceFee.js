module.exports = function validateServiceFee(body = {}) {
  if (typeof body.apply_service_fee !== 'boolean') {
    throw {
      status: 400,
      message: 'Informe se a taxa de serviço deve ser aplicada.',
    };
  }
};
