module.exports = function validatePaymentId(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
    throw { status: 400, message: 'O ID do pagamento é inválido.' };
  }
};
