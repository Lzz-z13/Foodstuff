
const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");
const OrderController = require("../controllers/orderController");

// Create an order for a command
router.post(
  "/commands/:command_id/orders",
  verifyRole("MANAGER", "WAITER"),
  OrderController.createOrder,
);

// Read orders
router.get(
  "/orders",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  OrderController.readAllOrders,
);

router.get(
  "/pedidos",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  OrderController.readOrders,
);

// Read an order by ID
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

// Update order status
router.patch(
  "/orders/:order_id/status",
  verifyRole("MANAGER", "KITCHEN"),
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

// Request the bill
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