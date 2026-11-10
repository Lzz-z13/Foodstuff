const validateCommandId = require('./validateCommandId');

module.exports = function validatePixPayment(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => key !== 'command_id')) {
    throw { status: 400, message: 'Informe somente command_id. O saldo e os dados do pagador são definidos pelo backend.' };
  }
  validateCommandId(body.command_id);
  if (!['string', 'number'].includes(typeof body.command_id) || !Number.isSafeInteger(Number(body.command_id))) {
    throw { status: 400, message: 'O ID da comanda é inválido.' };
  }
};
