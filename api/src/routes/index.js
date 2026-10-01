const router = require("express").Router();

const verifyJWT = require("../middlewares/verifyJWT");
const verifyFirstLogin = require("../middlewares/verifyFirstLogin");

const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const tableRoutes = require("./tableRoutes")
const qrCodeRoutes = require("./qrCodeRoutes");
const logRoutes = require("./logRoutes");
const QrCodeController = require("../controllers/qrCodeController");

// Public routes
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.get("/qr-codes/token/:token", QrCodeController.resolveQrCodeByToken);

// Routes with mixed rules
router.use(verifyJWT);
router.use("/users", userRoutes);

// Protected block FirstLogin routes
router.use(verifyFirstLogin);
router.use("/tables", tableRoutes);
router.use("/", qrCodeRoutes);
router.use("/logs", logRoutes);


module.exports = router;