const router = require("express").Router();


const verifyJWT = require("../middlewares/verifyJWT");


const healthRoutes = require("./healthRoutes");


// Public routes
router.use("/health", healthRoutes);

module.exports = router;