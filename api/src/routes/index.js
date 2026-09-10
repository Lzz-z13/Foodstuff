const router = require("express").Router();

const verifyJWT = require("../middlewares/verifyJWT");
const verifyFirstLogin = require("../middlewares/verifyFirstLogin");

const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const tableRoutes = require("./tableRoutes")
const logRoutes = require("./logRoutes");

// Public routes
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

// Routes with mixed rules
router.use(verifyJWT);
router.use("/users", userRoutes);

// Protected block FirstLogin routes
router.use(verifyFirstLogin);
router.use("/tables", tableRoutes);
router.use("/logs", logRoutes);


module.exports = router;