const jwt = require("jsonwebtoken");
const { ADMIN, WAITER } = require("../setup/constants");

function tokenFor(user) {
  return jwt.sign(
    { id: user.id, role: user.role, first_login: user.first_login },
    process.env.SECRET,
    { expiresIn: "1h" },
  );
}

const managerToken = () =>
  tokenFor({
    id: ADMIN.user_id,
    role: ADMIN.role,
    first_login: ADMIN.first_login,
  });

const waiterToken = () =>
  tokenFor({ id: WAITER.user_id, role: WAITER.role, first_login: WAITER.first_login });

const kitchenToken = () =>
  tokenFor({
    id: "33333333-3333-3333-3333-333333333333",
    role: "KITCHEN",
    first_login: 0,
  });

const cashierToken = () =>
  tokenFor({
    id: "44444444-4444-4444-4444-444444444444",
    role: "CASHIER",
    first_login: 0,
  });

module.exports = {
  tokenFor,
  managerToken,
  waiterToken,
  kitchenToken,
  cashierToken,
};