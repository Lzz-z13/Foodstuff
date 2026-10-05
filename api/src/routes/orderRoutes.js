const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const OrderController = require("../controllers/orderController");

router.post(
  "/commands/:command_id/orders",
  verifyRole("MANAGER", "WAITER"),
  OrderController.createOrder,
);

module.exports = router;
