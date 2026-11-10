const CashierService = require('../services/cashierService');
const validatePixPayment = require('../validations/validatePixPayment');
const validatePaymentId = require('../validations/validatePaymentId');

async function criarPagamentoPix(req, res, next) {
  try {
    validatePixPayment(req.body);
    const result = await CashierService.createPix(req.body.command_id, req.user.id);
    res.status(result.created ? 201 : 200).json({ error: false, data: result.payment });
  } catch (error) { next(error); }
}

async function readPayment(req, res, next) {
  try {
    validatePaymentId(req.params.payment_id);
    const data = await CashierService.readPixStatus(req.params.payment_id, req.user.id);
    res.json({ error: false, data });
  } catch (error) { next(error); }
}

async function webhook(req, res, next) {
  try {
    // O identificador usado vem da query assinada, nunca do body.
    await CashierService.confirmPixOrder(req.mercadoPagoOrderId);
    res.status(200).json({ error: false, message: 'Notificação processada.' });
  } catch (error) { next(error); }
}

async function cancelPayment(req, res, next) {
  try {
    validatePaymentId(req.params.payment_id);
    const data = await CashierService.cancelPix(req.params.payment_id, req.user.id);
    res.json({ error: false, data });
  } catch (error) { next(error); }
}

module.exports = { criarPagamentoPix, readPayment, cancelPayment, webhook };
