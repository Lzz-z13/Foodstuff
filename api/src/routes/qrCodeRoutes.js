const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const QrCodeController = require("../controllers/qrCodeController");

router.post(
  "/tables/:table_id/qr-codes",
  verifyRole("MANAGER"),
  QrCodeController.createQrCode
);

router.get(
  "/tables/:table_id/qr-codes",
  verifyRole("MANAGER"),
  QrCodeController.readQrCodesByTable
);

router.delete(
  "/qr-codes/:qr_code_id",
  verifyRole("MANAGER"),
  QrCodeController.deleteQrCode
);

module.exports = router;