const router = require("express").Router();

const PublicController = require("../controllers/publicController");

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.get("/products", PublicController.readProducts);

router.get("/products/:product_id", PublicController.readProductById);

router.get("/categories", PublicController.readCategories);

router.get(
  "/commands/:session_token",
  PublicController.readCommandBySession,
);

router.post(
  "/commands/:session_token/orders",
  PublicController.createOrderBySession,
);

module.exports = router;
