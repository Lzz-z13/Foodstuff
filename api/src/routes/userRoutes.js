const router = require("express").Router();

const verifyRole = require("../middlewares/verifyRole");
// const verifyFirstLogin = require("../middlewares/verifyFirstLogin");

const UserController = require("../controllers/userController");

// Logged user
// Change password route here

// router.use(verifyFirstLogin);

// manager only
router.use(verifyRole("MANAGER"));

router.post(
  "/",
  UserController.createUser
);

router.get(
  "/",
  UserController.readAllUsers
);

// router.patch(
//   "/:user_id",
//   UserController.updateUser
// );

// router.delete(
//   "/:user_id",
//   UserController.deleteUser
// );

// router.patch(
//   "/:user_id/reset-password",
//   UserController.resetPassword
// );

module.exports = router;