const connect = require("../database/connect");
const createLog = require("../utils/createLog");

const crypto = require("crypto");

module.exports = class QrCodeService {
  static async createQrCode(table_id, position, jwt_user_id) {
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
      const tableQuery = `
        SELECT table_id, number
        FROM tables
        WHERE table_id = ?
          AND is_active = 1
        LIMIT 1
      `;

      const [tableResult] = await connection.execute(tableQuery, [table_id]);

      if (tableResult.length === 0) {
        throw {
          status: 404,
          message: "Mesa não encontrada.",
        };
      }

      const table_number = tableResult[0].number;

      // Verify if there is already a QR code in this position
      const qrQuery = `
        SELECT qr_code_id, is_active
        FROM qr_codes
        WHERE table_id = ?
          AND position = ?
        LIMIT 1
      `;

      const [existingQr] = await connection.execute(qrQuery, [
        table_id,
        position,
      ]);

      if (existingQr.length > 0) {
        const qr = existingQr[0];

        // QR code is already active in this position
        if (qr.is_active) {
          throw {
            status: 409,
            message: "Já existe um QR Code ativo nessa posição.",
          };
        }

        // QR code exists, but is inactive -> reactive preserving its token
        const reactivateQuery = `
          UPDATE qr_codes
          SET is_active = 1
          WHERE qr_code_id = ?
        `;

        await connection.execute(reactivateQuery, [qr.qr_code_id]);

        await createLog(
          connection,
          jwt_user_id,
          "REACTIVATE",
          "qr_codes",
          qr.qr_code_id,
          `Usuário ${user_name} reativou o QR Code da mesa #${table_number} na posição ${position}.`,
        );

        await connection.commit();

        return {
          message: "QR Code reativado com sucesso.",
          qr_code_id: qr.qr_code_id,
        };
      }

      // QR code doesn't exist -> create with a backend generated token
      const token = crypto.randomUUID();

      const createQuery = `
        INSERT INTO qr_codes (token, position, table_id)
        VALUES (?, ?, ?)
      `;

      const [result] = await connection.execute(createQuery, [
        token,
        position,
        table_id,
      ]);

      const newQrCodeId = result.insertId;

      await createLog(
        connection,
        jwt_user_id,
        "INSERT",
        "qr_codes",
        newQrCodeId,
        `Usuário ${user_name} criou o QR Code da mesa #${table_number} na posição ${position}.`,
      );

      await connection.commit();

      return {
        message: "QR Code criado com sucesso.",
        qr_code_id: newQrCodeId,
      };
    } catch (error) {
      await connection.rollback();

      if (error.status) {
        throw error;
      }

      if (error.code === "ER_DUP_ENTRY") {
        throw {
          status: 409,
          message: "Já existe um QR Code nessa posição.",
        };
      }

      throw {
        status: 500,
        message: "Erro ao criar o QR Code.",
      };
    } finally {
      connection.release();
    }
  }

  static async readQrCodesByTable(table_id) {
    // Verify the table exists (active or inactive tables can be consulted)
    const tableQuery = `
      SELECT table_id
      FROM tables
      WHERE table_id = ?
      LIMIT 1
    `;

    const qrQuery = `
      SELECT
        qr_code_id,
        position,
        token,
        is_active,
        created_at
      FROM qr_codes
      WHERE table_id = ?
      ORDER BY position
    `;

    try {
      const [tableResult] = await connect.execute(tableQuery, [table_id]);

      if (tableResult.length === 0) {
        throw {
          status: 404,
          message: "Mesa não encontrada.",
        };
      }

      const [qrCodes] = await connect.execute(qrQuery, [table_id]);

      return qrCodes;
    } catch (error) {
      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: "Erro ao buscar os QR Codes da mesa.",
      };
    }
  }

  static async resolveQrCodeByToken(token) {
    const query = `
      SELECT
        qr.qr_code_id,
        qr.position,
        tbl.table_id,
        tbl.number
      FROM qr_codes qr
      INNER JOIN tables tbl ON tbl.table_id = qr.table_id
      WHERE qr.token = ?
        AND qr.is_active = 1
        AND tbl.is_active = 1
      LIMIT 1
    `;

    try {
      const [qrCodes] = await connect.execute(query, [token]);

      if (qrCodes.length === 0) {
        throw {
          status: 404,
          message: "QR Code não encontrado.",
        };
      }

      return qrCodes[0];
    } catch (error) {
      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: "Erro ao buscar o QR Code.",
      };
    }
  }
};