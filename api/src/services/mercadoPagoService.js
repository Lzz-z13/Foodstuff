const axios = require('axios');
const validator = require('validator');

const ORDERS_URL = 'https://api.mercadopago.com/v1/orders';

function options(idempotencyKey) {
  if (!process.env.MP_ACCESS_TOKEN?.trim()) {
    throw { status: 503, message: 'Configure MP_ACCESS_TOKEN para utilizar o Mercado Pago.' };
  }
  return {
    timeout: 8000,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN.trim()}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
    },
  };
}

function buildPixRequest(total, externalReference) {
  options();
  const email = process.env.MP_PAYER_EMAIL?.trim();
  if (!email || !validator.isEmail(email)) {
    throw { status: 503, message: 'Configure MP_PAYER_EMAIL com um e-mail controlado válido para os testes do TCC.' };
  }
  if (!Number.isFinite(total) || total <= 0 || total > 99999999.99) {
    throw { status: 400, message: 'Saldo inválido para gerar Pix.' };
  }
  const amount = total.toFixed(2);
  return {
    type: 'online',
    processing_mode: 'automatic',
    external_reference: externalReference,
    total_amount: amount,
    transactions: { payments: [{ amount, payment_method: { id: 'pix', type: 'bank_transfer' } }] },
    payer: { email },
  };
}

function communicationError(error) {
  // Nunca encaminhar o erro Axios: ele contém headers com o Access Token.
  return {
    status: error.code === 'ECONNABORTED' ? 504 : 502,
    message: 'Não foi possível confirmar a operação no Mercado Pago. A tentativa permanece preservada; consulte seu status antes de cobrar novamente. Verifique as credenciais e MP_PAYER_EMAIL se a solicitação foi recusada.',
  };
}

async function criarPix({ payload, idempotencyKey }) {
  if (!idempotencyKey || !payload) throw { status: 400, message: 'Tentativa Pix inválida.' };
  const config = options(idempotencyKey);
  try {
    const { data } = await axios.post(ORDERS_URL, payload, config);
    return data;
  } catch (error) { throw communicationError(error); }
}

async function readOrder(orderId) {
  if (typeof orderId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(orderId)) {
    throw { status: 400, message: 'Identificador da order inválido.' };
  }
  const config = options();
  try {
    const { data } = await axios.get(`${ORDERS_URL}/${encodeURIComponent(orderId)}`, config);
    return data;
  } catch (error) { throw communicationError(error); }
}

module.exports = { buildPixRequest, criarPix, readOrder };
