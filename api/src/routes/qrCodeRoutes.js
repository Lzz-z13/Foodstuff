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

module.exports = router;