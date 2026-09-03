const express = require("express");
require("dotenv-safe").config();
const testConnect = require("./database/testConnect");
const cors = require("cors");
const errorHandler = require("./middlewares/errorHandler");

class AppController {
  constructor() {
    this.express = express();
    this.middlewares();
    this.routes();
    this.errorHandlers()
  }

  middlewares() {
    this.express.use(express.json({ limit: "16mb" })); // Be careful not to affect the blob
    this.express.use(cors({
      origin: "*",
      methods: "GET, POST, PUT, DELETE, PATCH",
      credentials: true,
      optionsSuccessStatus: 204,
    }));
  }

  routes() {
    const apiRoutes = require("./routes/index");
    this.express.use("/api/foodstuff", apiRoutes);
  }

  errorHandlers() {
    this.express.use(errorHandler);
  }
}

module.exports = new AppController().express;
