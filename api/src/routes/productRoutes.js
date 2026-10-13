const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const ProductController = require("../controllers/productController");

router.post("/", verifyRole("MANAGER"), ProductController.createProduct);

router.get(
  "/",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  ProductController.readAllProducts,
);

router.get(
  "/:product_id",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  ProductController.readProductById,
);

router.patch(
  "/:product_id",
  verifyRole("MANAGER"),
  ProductController.updateProduct,
);

router.patch(
  "/:product_id/availability",
  verifyRole("MANAGER"),
  ProductController.updateAvailability,
);

router.delete(
  "/:product_id",
  verifyRole("MANAGER"),
  ProductController.deleteProduct,
);

module.exports = router;
