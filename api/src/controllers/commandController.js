const CommandService = require("../services/commandService");
const validateCommand = require("../validations/validateCommand");
const validateTableId = require("../validations/validateTableId");
const validateQrCodeToken = require("../validations/validateQrCodeToken");
const validateSessionToken = require("../validations/validateSessionToken");

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

  static async createCommandByTable(req, res, next) {
    const jwt_user_id = req.user.id;
    const { table_id } = req.params;

    try {
      validateTableId(table_id);
      validateCommand(req.body);

      const result = await CommandService.createCommandByTable(
        table_id,
        req.body.customer_name.trim(),
        jwt_user_id,
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

  static async readCommandBySession(req, res, next) {
    const { session_token } = req.params;

    try {
      validateSessionToken(session_token);

      const command = await CommandService.readCommandBySession(session_token);

      return res.status(200).json({
        error: false,
        message: "Comanda encontrada com sucesso.",
        data: command,
      });
    } catch (error) {
      next(error);
    }
  }
};
