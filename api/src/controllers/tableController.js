const TableService = require("../services/tableService");
const validateTable = require("../validations/validateTable");

module.exports = class TableController {
  static async createTable(req, res, next) {
    const jwt_user_id = req.user.id;
    const { number } = req.body;

    try {
      validateTable(req.body, false);

      const newTableId = await TableService.createTable(number, jwt_user_id);
      return res.status(201).json({
        error: false,
        message: "Mesa criada com sucesso.",
        data: { table_id: newTableId },
      });
    } catch (error) {
      next(error);
    }
  }
}