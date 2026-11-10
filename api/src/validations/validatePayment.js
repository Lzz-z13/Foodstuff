const METHODS = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'VOUCHER'];

function validMoney(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 &&
    value <= 99999999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
}

module.exports = function validatePayment(body = {}) {
  if (body.method === 'PIX') {
    throw { status: 400, message: 'Utilize /payments/pix. Pix só pode ser confirmado pelo Mercado Pago.' };
  }
  if (!METHODS.includes(body.method)) {
    throw { status: 400, message: 'Selecione um método de pagamento válido.' };
  }
  if (!validMoney(body.value) || !validMoney(body.expected_balance)) {
    throw { status: 400, message: 'Informe valores positivos com até duas casas decimais.' };
  }
  if (body.method === 'CASH' && (!validMoney(body.received_amount) || body.received_amount < body.value)) {
    throw { status: 400, message: 'O valor recebido deve cobrir o pagamento.' };
  }
};
