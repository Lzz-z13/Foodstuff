const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const CommandController = require("../controllers/commandController");

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

module.exports = router;