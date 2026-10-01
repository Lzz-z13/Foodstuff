const TEST_DB_NAME = "foodstuff_test";

const TEST_TABLES = [
  "users",
  "tables",
  "qr_codes",
  "commands",
  "orders",
  "order_items",
  "payments",
  "categories",
  "products",
  "audit_logs",
];

const ADMIN = {
  user_id: "1c869085-e414-4b18-8f8f-1ca8181c1033",
  name: "admin_first_user",
  email: "admin@admin.com",
  phone: "11999551188",
  password: "$2b$10$YS0iwI4iNnnmwyVy8WatdOEgOPWWohkEFixRvKfEKXYlE7OPLmgP.",
  role: "MANAGER",
  first_login: 0,
};

const WAITER = {
  user_id: "22222222-1111-1111-1111-111111111111",
  name: "garcom_teste",
  email: "waiter@foodstuff.test",
  phone: "21999990000",
  password: "$2b$10$YS0iwI4iNnnmwyVy8WatdOEgOPWWohkEFixRvKfEKXYlE7OPLmgP.",
  role: "WAITER",
  first_login: 0,
};

module.exports = {
  TEST_DB_NAME,
  TEST_TABLES,
  ADMIN,
  WAITER,
};