const router = require("express").Router();

const verifyJWT = require("../middlewares/verifyJWT");
const verifyFirstLogin = require("../middlewares/verifyFirstLogin");

const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");

// Public routes
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

// Routes with mixed rules
router.use(verifyJWT);
router.use("/users", userRoutes);

// Fully protected routes
router.use(verifyFirstLogin);

module.exports = router;