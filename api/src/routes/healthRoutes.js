const router = require("express").Router();
const connect = require("../database/connect");

router.get("/", (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "api",
    uptime_seconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/db", async (req, res) => {
  try {
    await connect.execute("SELECT 1");

    return res.status(200).json({
      status: "ok",
      service: "database",
      timestamp: new Date().toISOString(),
    });

  } catch {
    return res.status(500).json({
      status: "error",
      service: "database",
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;