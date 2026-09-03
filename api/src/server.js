const app = require("./index");
const testConnect = require("./database/testConnect");

const PORT = 5000;

// IIFE
(async () => {
  await testConnect();

  app.listen(PORT, () => {
    console.log("API running on port:", PORT);
  });
})();