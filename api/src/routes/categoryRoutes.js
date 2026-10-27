const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const CategoryController = require("../controllers/categoryController");

router.post("/", verifyRole("MANAGER"), CategoryController.createCategory);

router.get(
  "/",
  verifyRole("MANAGER", "WAITER", "KITCHEN", "CASHIER"),
  CategoryController.readAllCategories,
);

router.patch(
  "/:category_id",
  verifyRole("MANAGER"),
  CategoryController.updateCategory,
);

router.delete(
  "/:category_id",
  verifyRole("MANAGER"),
  CategoryController.deleteCategory,
);

module.exports = router;
