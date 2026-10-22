const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const OrderController = require("../controllers/orderController");

router.post(
  "/commands/:command_id/orders",
  verifyRole("MANAGER", "WAITER"),
  OrderController.createOrder,
);

router.get(
  "/orders",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  OrderController.readAllOrders,
);

router.get(
  "/orders/:order_id",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  OrderController.readOrderById,
);

router.patch(
  "/orders/:order_id/status",
  verifyRole("MANAGER", "KITCHEN"),
  OrderController.updateOrderStatus,
);

module.exports = router;
