const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const LogController = require("../controllers/logController");

router.use(verifyRole("MANAGER"));

router.get(
  "/",
  LogController.readAllLogs
);

router.get(
  "/:entity",
  LogController.readLogsByTableName
);

module.exports = router;