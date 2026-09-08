const router = require("express").Router();

// const loginRateLimiter = require("../middlewares/rateLimiter");

const UserController = require("../controllers/userController");

router.post(
  "/login",
  UserController.loginUser
);

module.exports = router;