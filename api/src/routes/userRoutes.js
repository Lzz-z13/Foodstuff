  const router = require("express").Router();

  const verifyRole = require("../middlewares/verifyRole");
  const verifyFirstLogin = require("../middlewares/verifyFirstLogin");

  const UserController = require("../controllers/userController");

<<<<<<< HEAD
  // Logged user
  router.get(
    "/me",
    UserController.readCurrentUser
  );

  router.patch(
    "/me/password",
    UserController.updateUserPassword
  );
=======
// Logged user
router.patch(
  "/me/password",
  UserController.updateUserPassword
);
>>>>>>> origin/main

  router.delete(
    "/me",
    UserController.deleteOwnUserAccount
  );

  router.use(verifyFirstLogin);

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

<<<<<<< HEAD
  // router.patch(
  //   "/:user_id",
  //   UserController.updateUser
  // );
=======
router.patch(
  "/:user_id",
  UserController.updateUserById
);
>>>>>>> origin/main

  router.delete(
    "/:user_id",
    UserController.deleteUserById
  );

  // router.patch(
  //   "/:user_id/reset-password",
  //   UserController.resetPassword
  // );

  module.exports = router;