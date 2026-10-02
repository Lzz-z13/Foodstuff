const CommandService = require("../services/commandService");
const validateCommand = require("../validations/validateCommand");
const validateQrCodeToken = require("../validations/validateQrCodeToken");

module.exports = class CommandController {
  static async createCommandByQr(req, res, next) {
    const { token } = req.params;

    try {
      validateQrCodeToken(token);
      validateCommand(req.body);

      const result = await CommandService.createCommandByQr(
        token,
        req.body.customer_name.trim(),
      );

      return res.status(201).json({
        error: false,
        message: result.message,
        data: {
          command_id: result.command_id,
          session_token: result.session_token,
          status: result.status,
          table_id: result.table_id,
          qr_code_id: result.qr_code_id,
        },
      });
    } catch (error) {
      next(error);
    }
  }
};
