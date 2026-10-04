const TableService = require("../services/tableService");
const validateTable = require("../validations/validateTable");
const validateTableId = require("../validations/validateTableId");

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
      validateTableId(table_id);
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

  static async deleteTable(req, res, next) {
    const jwt_user_id = req.user.id;
    const { table_id } = req.params;

    try {
      validateTableId(table_id);
      const result = await TableService.deleteTable(table_id, jwt_user_id);

      return res.status(200).json({
        error: false,
        message: result.message,
        data: {
          table_id: result.table_id,
          qr_codes_deactivated: result.qr_codes_deactivated,
          commands_cancelled: result.commands_cancelled,
          orders_cancelled: result.orders_cancelled,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
