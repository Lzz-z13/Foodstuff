const TableService = require("../services/tableService");
const validateTable = require("../validations/validateTable");

module.exports = class TableController {
  static async createTable(req, res, next) {
    const jwt_user_id = req.user.id;
    const { number } = req.body;

    try {
      validateTable(req.body, false);

      const result = await TableService.createTable(number, jwt_user_id);
      return res.status(201).json({
        error: false,
        message: result.message,
        data: { table_id: result.table_id },
      });
    } catch (error) {
      next(error);
    }
  }

  static async readAllTables(req, res, next) {
    try {
      const tables = await TableService.readAllTables();
      return res.status(200).json({
        error: false,
        message: "Mesas buscadas com sucesso.",
        data: tables,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTable(req, res, next) {
    const jwt_user_id = req.user.id;
    const { table_id } = req.params;
    const { number } = req.body;

    try {
      validateTable(req.body, true);

      const result = await TableService.updateTable(
        table_id,
        number,
        jwt_user_id,
      );

      return res.status(200).json({
        error: false,
        message: result.message,
        data: { table_id: result.table_id },
      });
    } catch (error) {
      next(error);
    }
  }
}
