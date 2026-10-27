const QrCodeService = require("../services/qrCodeService");
const validateQrCode = require("../validations/validateQrCode");
const validateQrCodeToken = require("../validations/validateQrCodeToken");
const validateQrCodeId = require("../validations/validateQrCodeId");
const validateTableId = require("../validations/validateTableId");

module.exports = class QrCodeController {
  static async createQrCode(req, res, next) {
    const jwt_user_id = req.user.id;
    const { table_id } = req.params;
    const { position } = req.body;

    try {
      validateTableId(table_id);
      validateQrCode(req.body);

      const result = await QrCodeService.createQrCode(
        table_id,
        position,
        jwt_user_id,
      );

      return res.status(201).json({
        error: false,
        message: result.message,
        data: { qr_code_id: result.qr_code_id },
      });
    } catch (error) {
      next(error);
    }
  }

  static async readQrCodesByTable(req, res, next) {
    const { table_id } = req.params;

    try {
      validateTableId(table_id);
      const qrCodes = await QrCodeService.readQrCodesByTable(table_id);

      return res.status(200).json({
        error: false,
        message: "QR Codes buscados com sucesso.",
        data: qrCodes,
      });
    } catch (error) {
      next(error);
    }
  }

  static async resolveQrCodeByToken(req, res, next) {
    const { token } = req.params;

    try {
      validateQrCodeToken(token);

      const qrCode = await QrCodeService.resolveQrCodeByToken(token);

      return res.status(200).json({
        error: false,
        message: "QR Code encontrado com sucesso.",
        data: qrCode,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteQrCode(req, res, next) {
    const jwt_user_id = req.user.id;
    const { qr_code_id } = req.params;

    try {
      validateQrCodeId(qr_code_id);

      const result = await QrCodeService.deleteQrCode(qr_code_id, jwt_user_id);

      return res.status(200).json({
        error: false,
        message: result.message,
        data: { qr_code_id: result.qr_code_id },
      });
    } catch (error) {
      next(error);
    }
  }
};