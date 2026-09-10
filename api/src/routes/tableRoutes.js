const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const TableController = require("../controllers/tableController");

router.use(verifyRole("MANAGER"));

router.post(
  "/",
  TableController.createTable
);

router.use(verifyRole("MANAGER", "WAITER"));

router.get(
  "/",
  TableController.readAllTables
);

module.exports = router;