const CashierService = require('../services/cashierService');
const validateCommandId = require('../validations/validateCommandId');
const validatePayment = require('../validations/validatePayment');

module.exports = class CashierController {
  static async readSummary(req, res, next) {
    try { res.json({ error: false, data: await CashierService.readSummary() }); }
    catch (error) { next(error); }
  }
  static async readCommands(req, res, next) {
    try { res.json({ error: false, data: await CashierService.readCommands() }); }
    catch (error) { next(error); }
  }
  static async readCheckout(req, res, next) {
    try {
      validateCommandId(req.params.command_id);
      res.json({ error: false, data: await CashierService.readCheckout(req.params.command_id) });
    } catch (error) { next(error); }
  }
  static async pay(req, res, next) {
    try {
      validateCommandId(req.params.command_id);
      validatePayment(req.body);
      const data = await CashierService.pay(req.params.command_id, req.body, req.user.id);
      res.status(201).json({ error: false, message: 'Pagamento registrado com sucesso.', data });
    } catch (error) { next(error); }
  }
};
