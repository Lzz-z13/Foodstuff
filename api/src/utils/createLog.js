module.exports = async function createLog(
  connection,
  userId,
  action,
  entity,
  entityId,
  description,
  metadata = null
) {
  const query = `
    INSERT INTO audit_logs
    (user_id, action, entity, entity_id, description, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  await connection.execute(query, [
    userId,
    action,
    entity,
    entityId,
    description,
    metadata
  ]);

  console.log(`Log criado: ${action} em ${entity} #${entityId}`);
};