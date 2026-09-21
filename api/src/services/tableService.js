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

  static async updateTable(table_id, number, jwt_user_id) {
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

      // Verify the target table exists and is active
      const targetQuery = `
        SELECT table_id, number
        FROM tables
        WHERE table_id = ?
          AND is_active = 1
        LIMIT 1
      `;

      const [targetResult] = await connection.execute(targetQuery, [table_id]);

      if (targetResult.length === 0) {
        throw {
          status: 404,
          message: "Mesa não encontrada.",
        };
      }

      const old_number = targetResult[0].number;

      if (number === old_number) {
        throw {
          status: 409,
          message: "O número informado já é o número atual da mesa.",
        };
      }

      // Verify if another table already uses this number
      const conflictQuery = `
        SELECT table_id, is_active
        FROM tables
        WHERE number = ?
          AND table_id != ?
        LIMIT 1
      `;

      const [conflictResult] = await connection.execute(conflictQuery, [
        number,
        table_id,
      ]);

      if (conflictResult.length > 0) {
        const conflictTable = conflictResult[0];

        if (conflictTable.is_active) {
          throw {
            status: 409,
            message: "Já existe uma mesa ativa com esse número.",
          };
        }

        throw {
          status: 409,
          message:
            "Esse número pertence a uma mesa desativada. Reative essa mesa ou escolha outro número.",
        };
      }

      // Update table number
      const updateQuery = `
        UPDATE tables
        SET number = ?
        WHERE table_id = ?
          AND is_active = 1
      `;

      await connection.execute(updateQuery, [number, table_id]);

      await createLog(
        connection,
        jwt_user_id,
        "UPDATE",
        "tables",
        table_id,
        `Usuário ${user_name} alterou a mesa #${old_number} para #${number}.`,
      );

      await connection.commit();

      return {
        message: "Mesa atualizada com sucesso.",
        table_id: table_id,
      };
    } catch (error) {
      await connection.rollback();

      if (error.status) {
        throw error;
      }

      if (error.code === "ER_DUP_ENTRY") {
        throw {
          status: 409,
          message: "O número informado já está em uso.",
        };
      }

      throw {
        status: 500,
        message: "Erro ao atualizar a mesa.",
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
      ORDER BY number
    `;

    try {
      const [tables] = await connect.execute(query);
      return tables;
    } catch (error) {
      throw { status: 500, message: "Erro ao buscar as mesas ativas." };
    }
  }
};
