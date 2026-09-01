const express = require("express");
require("dotenv-safe").config();
const testConnect = require("./database/testConnect");
const cors = require("cors");

class AppController {
  constructor() {
    this.express = express();
    this.middlewares();
    this.routes();
    this.errorHandlers()
  }

  middlewares() {
    this.express.use(express.json({ limit: "10mb" })); // Be careful not to affect the blob
    this.express.use(cors({
      origin: "*",
      methods: "GET, POST, PUT, DELETE, PATCH",
      credentials: true,
      optionsSuccessStatus: 204,
    }));
  }

  routes() {
    const apiRoutes = require("./routes/index");
    this.express.use("/", apiRoutes);
  }

  
}
module.exports = new AppController().express;
