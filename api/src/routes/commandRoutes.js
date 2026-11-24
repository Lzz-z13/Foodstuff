const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const CommandController = require("../controllers/commandController");
const CashierController = require("../controllers/cashierController");
const verifyFirstLogin = require("../middlewares/verifyFirstLogin");

router.get(
  "/commands",
  verifyRole("MANAGER", "CASHIER"),
  verifyFirstLogin,
  CashierController.readCommands,
);
router.get(
  "/cashier/summary",
  verifyRole("MANAGER", "CASHIER"),
  verifyFirstLogin,
  CashierController.readSummary,
);
router.get(
  "/commands/:command_id/checkout",
  verifyRole("MANAGER", "CASHIER"),
  verifyFirstLogin,
  CashierController.readCheckout,
);
router.post(
  "/commands/:command_id/payments",
  verifyRole("MANAGER", "CASHIER"),
  verifyFirstLogin,
  CashierController.pay,
);

router.patch(
  "/commands/:command_id/service-fee",
  verifyRole("MANAGER", "CASHIER"),
  verifyFirstLogin,
  CashierController.updateServiceFee,
);

router.post(
  "/tables/:table_id/commands",
  verifyRole("MANAGER", "WAITER"),
  CommandController.createCommandByTable,
);

router.get(
  "/tables/:table_id/commands",
  verifyRole("MANAGER", "WAITER", "CASHIER"),
  CommandController.readCommandsByTable,
);

router.get(
  "/commands/:command_id",
  verifyRole("MANAGER", "WAITER", "CASHIER"),
  CommandController.readCommandById,
);

router.post(
  "/commands/:command_id/close",
  verifyRole("MANAGER", "WAITER", "CASHIER"),
  CommandController.closeCommand,
);

module.exports = router;
