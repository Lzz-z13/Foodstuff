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

module.exports = router;