const connect = require("../database/connect");
const createLog = require("../utils/createLog");

module.exports = class TableService {
  static async createTable(number, jwt_user_id) {
    const connection = await connect.getConnection();

    try {
      await connection.beginTransaction();

      // Search the responsible
      const userQuery = `
        SELECT name
        FROM users
        WHERE user_id = ?
          AND is_active = 1
        LIMIT 1
      `;

      const [userResult] = await connection.execute(userQuery, [jwt_user_id]);

      if (userResult.length === 0) {
        throw {
          status: 404,
          message: "Usuário responsável não encontrado.",
        };
      }

      const user_name = userResult[0].name;

      // Verify if there is a table with this number
      const tableQuery = `
        SELECT table_id, is_active
        FROM tables
        WHERE number = ?
        LIMIT 1
      `;

      const [existingTable] = await connection.execute(tableQuery, [number]);

      if (existingTable.length > 0) {
        const table = existingTable[0];

        // Table is already active
        if (table.is_active) {
          throw {
            status: 409,
            message: "Já existe uma mesa ativa com esse número.",
          };
        }

        // Table exist, but is inactive -> reactive
        const reactivateQuery = `
          UPDATE tables
          SET is_active = 1
          WHERE table_id = ?
        `;

        await connection.execute(reactivateQuery, [table.table_id]);

        await createLog(
          connection,
          jwt_user_id,
          "REACTIVATE",
          "tables",
          table.table_id,
          `Usuário ${user_name} reativou a mesa #${number}.`,
        );

        await connection.commit();

        return {
          message: "Mesa reativada com sucesso.",
          table_id: table.table_id,
        };
      }

      // Table doesn't exist -> create
      const createQuery = `
        INSERT INTO tables (number)
        VALUES (?)
      `;

      const [result] = await connection.execute(createQuery, [number]);

      const newTableId = result.insertId;

      await createLog(
        connection,
        jwt_user_id,
        "INSERT",
        "tables",
        newTableId,
        `Usuário ${user_name} criou a mesa #${number}.`,
      );

      await connection.commit();

      return {
        message: "Mesa criada com sucesso.",
        table_id: newTableId,
      };
    } catch (error) {
      await connection.rollback();

      if (error.status) {
        throw error;
      }

      if (error.code === "ER_DUP_ENTRY") {
        throw {
          status: 409,
          message: "Já existe uma mesa com esse número.",
        };
      }

      throw {
        status: 500,
        message: "Erro ao criar a mesa.",
      };
    } finally {
      connection.release();
    }
  }

  static async readAllTables() {
    const query = `
      SELECT
        table_id,
        number
      FROM tables
      WHERE is_active = 1
    `;

    try {
      const [tables] = await connect.execute(query);
      return tables;
    } catch (error) {
      throw { status: 500, message: "Erro ao buscar as mesas ativas." };
    }
  }
};
