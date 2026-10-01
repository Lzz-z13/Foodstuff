const QrCodeService = require("../services/qrCodeService");
const validateQrCode = require("../validations/validateQrCode");

module.exports = class QrCodeController {
  static async createQrCode(req, res, next) {
    const jwt_user_id = req.user.id;
    const { table_id } = req.params;
    const { position } = req.body;

    try {
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
};