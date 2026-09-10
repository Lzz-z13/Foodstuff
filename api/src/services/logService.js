const connect = require("../database/connect");

module.exports = class LogService {
  static async readAllLogs() {
    const query = `
      SELECT
        log.log_id,
        log.user_id,
        log.action,
        log.entity,
        log.entity_id,
        log.description,
        log.metadata,
        log.created_at 
      FROM audit_logs log
      ORDER BY created_at DESC
    `;
    try {
      const [logs] = await connect.execute(query);
      return logs;
    } catch (error) {
      if (error.status) throw error;
      throw { status: 500, message: "Erro interno do servidor." };
    }
  }

  static async readLogsByTableName(entity) {
    const query = `
      SELECT
        log.log_id,
        log.user_id,
        log.action,
        log.entity,
        log.entity_id,
        log.description,
        log.metadata,
        log.created_at 
      FROM audit_logs log
      WHERE entity = ?
      ORDER BY created_at DESC
    `;
    try {
      const [logs] = await connect.execute(query, [entity]);
      return logs;
    } catch (error) {
      console.log(error)
      if (error.status) throw error;
      throw { status: 500, message: "Erro interno do servidor." };
    }
  }
};
