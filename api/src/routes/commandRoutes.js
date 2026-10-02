const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const CommandController = require("../controllers/commandController");

router.post(
  "/tables/:table_id/commands",
  verifyRole("MANAGER", "WAITER"),
  CommandController.createCommandByTable,
);

module.exports = router;