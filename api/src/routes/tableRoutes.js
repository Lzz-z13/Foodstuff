const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const TableController = require("../controllers/tableController");

router.use(verifyRole("MANAGER"));

router.post(
  "/",
  TableController.createTable
);

module.exports = router;