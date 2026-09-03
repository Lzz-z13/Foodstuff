const router = require("express").Router();
const verifyJWT = require("../middlewares/verifyJWT");

const healthRoutes = require("./healthRoutes");

// Public routes
router.use("/health", healthRoutes);
// router.use("/auth", authRoutes);

// Routes with mixed rules
// router.use("/users", userRoutes);

// Fully protected routes
router.use(verifyJWT);
// router.use(verifyFirstLogin);

module.exports = router;