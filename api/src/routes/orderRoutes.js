const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");
const OrderController = require("../controllers/orderController");

router.get(
  "/orders",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  OrderController.readOrders,
);

router.get(
  "/pedidos",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  OrderController.readOrders,
);

router.get(
  "/orders/:order_id",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  OrderController.readOrderById,
);

router.get(
  "/pedidos/:order_id",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  OrderController.readOrderById,
);

router.patch(
  "/orders/:order_id/status",
  verifyRole("MANAGER", "WAITER", "KITCHEN"),
  OrderController.updateOrderStatus,
);

router.patch(
  "/pedidos/:order_id",
  verifyRole("MANAGER", "WAITER", "KITCHEN"),
  OrderController.updateOrderStatus,
);

router.patch(
  "/pedidos/:order_id/status",
  verifyRole("MANAGER", "WAITER", "KITCHEN"),
  OrderController.updateOrderStatus,
);

router.post(
  "/orders/:order_id/conta",
  verifyRole("MANAGER", "WAITER", "CASHIER"),
  OrderController.requestAccount,
);

router.post(
  "/pedidos/:order_id/conta",
  verifyRole("MANAGER", "WAITER", "CASHIER"),
  OrderController.requestAccount,
);

module.exports = router;
