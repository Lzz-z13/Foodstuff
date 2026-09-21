const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const TableController = require("../controllers/tableController");

router.post(
  "/",
  verifyRole("MANAGER"),
  TableController.createTable
);

router.get(
  "/",
  verifyRole("MANAGER", "WAITER"),
  TableController.readAllTables
);

router.patch(
  "/:table_id",
  verifyRole("MANAGER"),
  TableController.updateTable
);

module.exports = router;