const LogService = require("../services/logService");
module.exports = class LogController {
  static async readAllLogs(req, res, next) {
    try {
      const logs = await LogService.readAllLogs();
      return res.status(200).json({
        error: false,
        message: "Logs buscados com sucesso.",
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }

  static async readLogsByTableName(req, res, next) {
    const { entity } = req.params;

    try {

      const allowedTables = [
        "users",
        "tables",
        "qr_codes",
        "commands",
        "payments",
        "orders",
        "products",
        "categories",
      ];

      if (!allowedTables.includes(entity)) {
        throw {
          status: 400,
          message: "Tabela inválida.",
        };
      }

      const logs =
        await LogService.readLogsByTableName(entity);

      return res.status(200).json({
        error: false,
        message: "Logs buscados com sucesso.",
        data: logs,
      });

    } catch (error) {
      next(error);
    }
  }
};
