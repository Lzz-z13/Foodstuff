  const router = require("express").Router();

  const verifyRole = require("../middlewares/verifyRole");
  const verifyFirstLogin = require("../middlewares/verifyFirstLogin");

  const UserController = require("../controllers/userController");

  // Logged user
  router.get(
    "/me",
    UserController.readCurrentUser
  );

  router.patch(
    "/me/password",
    UserController.updateUserPassword
  );

  router.use(verifyFirstLogin);

  router.delete(
    "/me",
    UserController.deleteOwnUserAccount
  );

  router.patch(
    "/me/photo",
    UserController.updateUserPhoto
  );

  router.patch(
    "/me",
    UserController.updateUserCredentials
  );

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

router.patch(
  "/:user_id",
  UserController.updateUserById
);

  router.delete(
    "/:user_id",
    UserController.deleteUserById
  );

  // router.patch(
  //   "/:user_id/reset-password",
  //   UserController.resetPassword
  // );

  module.exports = router;
