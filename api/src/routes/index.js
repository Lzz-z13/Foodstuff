const router = require("express").Router();

const verifyJWT = require("../middlewares/verifyJWT");
const verifyFirstLogin = require("../middlewares/verifyFirstLogin");

const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const tableRoutes = require("./tableRoutes")
const qrCodeRoutes = require("./qrCodeRoutes");
const commandRoutes = require("./commandRoutes");
const orderRoutes = require("./orderRoutes");
const logRoutes = require("./logRoutes");
const QrCodeController = require("../controllers/qrCodeController");
const CommandController = require("../controllers/commandController");

// Public routes
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.get("/qr-codes/token/:token", QrCodeController.resolveQrCodeByToken);
router.post(
  "/qr-codes/token/:token/commands",
  CommandController.createCommandByQr,
);
router.get(
  "/commands/session/:session_token",
  CommandController.readCommandBySession,
);

// Routes with mixed rules
router.use(verifyJWT);
router.use("/users", userRoutes);

// Protected routes
router.use("/tables", tableRoutes);
router.use("/", qrCodeRoutes);
router.use("/", commandRoutes);
router.use("/", orderRoutes);
router.use("/logs", logRoutes);


module.exports = router;