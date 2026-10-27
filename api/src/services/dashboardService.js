const connect = require("../database/connect");

module.exports = class DashboardService {
  /**
   * Resumo do dia: faturamento, pedidos, ticket médio
   */
  static async getResumo() {
    const todayStart = "CURDATE()";
    const todayEnd = "CURDATE() + INTERVAL 1 DAY";

    // Faturamento do dia (pagamentos pagos hoje)
    const [faturamentoRows] = await connect.execute(
      `SELECT COALESCE(SUM(p.value), 0) AS total
       FROM payments p
       WHERE p.status = 'PAID'
         AND p.paid_at >= ${todayStart}
         AND p.paid_at < ${todayEnd}`
    );
    const faturamentoDia = Number(faturamentoRows[0]?.total ?? 0);

    // Pedidos do dia (não cancelados)
    const [pedidosRows] = await connect.execute(
      `SELECT COUNT(*) AS total
       FROM orders o
       WHERE o.status != 'CANCELLED'
         AND o.created_at >= ${todayStart}
         AND o.created_at < ${todayEnd}`
    );
    const pedidosHoje = Number(pedidosRows[0]?.total ?? 0);

    // Ticket médio
    const ticketMedio = pedidosHoje > 0 ? faturamentoDia / pedidosHoje : 0;

    // Avaliação média - não existe no banco
    const avaliacaoMedia = null;

    return {
      faturamentoDia,
      pedidosHoje,
      ticketMedio: Number(ticketMedio.toFixed(2)),
      avaliacaoMedia,
    };
  }

  /**
   * Faturamento dos últimos 7 dias (Seg a Dom)
   * Retorna array: [{ dia: "Seg", valor: 123.45 }, ...]
   */
  static async getFaturamentoSemanal() {
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const [rows] = await connect.execute(
      `SELECT 
         DAYOFWEEK(p.paid_at) AS dia_semana,
         COALESCE(SUM(p.value), 0) AS total
       FROM payments p
       WHERE p.status = 'PAID'
         AND p.paid_at >= CURDATE() - INTERVAL 6 DAY
         AND p.paid_at < CURDATE() + INTERVAL 1 DAY
       GROUP BY DAYOFWEEK(p.paid_at)`
    );

    // Mapa dia_semana (1=Dom ... 7=Sáb) -> valor
    const mapa = new Map();
    for (const r of rows) {
      mapa.set(Number(r.dia_semana), Number(r.total));
    }

    // Ordenar de Segunda a Domingo para o gráfico
    const ordem = [2, 3, 4, 5, 6, 7, 1]; // Seg..Dom
    return ordem.map((d) => ({
      dia: diasSemana[d - 1],
      valor: Number(mapa.get(d)?.toFixed(2) ?? 0),
    }));
  }

  /**
   * Pedidos por categoria (quantidade de itens vendidos)
   * Retorna: [{ nome: "Bebidas", quantidade: 25, cor: "#..." }, ...]
   */
  static async getPedidosPorCategoria() {
    const [rows] = await connect.execute(
      `SELECT 
         c.name AS categoria,
         COALESCE(SUM(oi.quantity), 0) AS quantidade
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN products p ON p.product_id = oi.product_id
       JOIN categories c ON c.category_id = p.category_id
       WHERE o.status != 'CANCELLED'
         AND o.created_at >= CURDATE() - INTERVAL 6 DAY
         AND o.created_at < CURDATE() + INTERVAL 1 DAY
       GROUP BY c.category_id, c.name
       ORDER BY quantidade DESC`
    );

    // Cores fixas para consistência no frontend
    const cores = [
      "#FF5A3D",
      "#3B82F6",
      "#F59E0B",
      "#10B981",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#84CC16",
    ];

    return rows.map((r, i) => ({
      nome: r.categoria,
      quantidade: Number(r.quantidade),
      cor: cores[i % cores.length],
    }));
  }

  /**
   * Top 5 produtos mais vendidos (última semana)
   * Retorna: [{ nome: "Burger", quantidade: 94 }, ...]
   */
  static async getMaisVendidos(limit = 5) {
    const [rows] = await connect.execute(
      `SELECT 
         p.name AS nome,
         COALESCE(SUM(oi.quantity), 0) AS quantidade
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       JOIN products p ON p.product_id = oi.product_id
       WHERE o.status != 'CANCELLED'
         AND o.created_at >= CURDATE() - INTERVAL 6 DAY
         AND o.created_at < CURDATE() + INTERVAL 1 DAY
       GROUP BY p.product_id, p.name
       ORDER BY quantidade DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map((r) => ({
      nome: r.nome,
      quantidade: Number(r.quantidade),
    }));
  }

  /**
   * Pedidos recentes (últimos 5)
   * Retorna: [{ pedido, mesa, itens, valor, status, hora }, ...]
   */
  static async getPedidosRecentes(limit = 5) {
    const [ordersRows] = await connect.execute(
      `SELECT 
         o.order_id,
         o.status,
         o.created_at,
         t.number AS mesa_numero,
         c.customer_name
       FROM orders o
       JOIN commands c ON c.command_id = o.command_id
       JOIN tables t ON t.table_id = c.table_id
       WHERE o.status != 'CANCELLED'
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [limit]
    );

    if (ordersRows.length === 0) return [];

    const orderIds = ordersRows.map((r) => r.order_id);
    const placeholders = orderIds.map(() => "?").join(",");

    const [itemsRows] = await connect.execute(
      `SELECT 
         oi.order_id,
         p.name AS produto,
         oi.quantity,
         oi.unit_price
       FROM order_items oi
       JOIN products p ON p.product_id = oi.product_id
       WHERE oi.order_id IN (${placeholders})`,
      orderIds
    );

    // Agrupar itens por order_id
    const itensPorPedido = new Map();
    for (const item of itemsRows) {
      const arr = itensPorPedido.get(item.order_id) || [];
      arr.push(`${item.quantity}x ${item.produto}`);
      itensPorPedido.set(item.order_id, arr);
    }

    // Mapear status do banco para labels do frontend
    const statusMap = {
      PENDING: "Novo",
      PREPARING: "Em Preparo",
      READY: "Pronto",
      DELIVERED: "Entregue",
      CANCELLED: "Cancelado",
    };

    return ordersRows.map((o) => {
      const itens = itensPorPedido.get(o.order_id) || [];
      const valor = itens.reduce((sum, _, idx) => {
        const item = itemsRows.find(
          (i) => i.order_id === o.order_id && i.produto === itens[idx]?.split("x ")[1]
        );
        return sum + (item ? Number(item.unit_price) * Number(itens[idx]?.split("x")[0] || 1) : 0);
      }, 0);

      // Formatar hora HH:MM
      const data = new Date(o.created_at);
      const hora = data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      return {
        pedido: `#${String(o.order_id).padStart(3, "0")}`,
        mesa: `Mesa ${o.mesa_numero}`,
        itens: itens.join(", "),
        valor: Number(valor.toFixed(2)),
        status: statusMap[o.status] || o.status,
        hora,
      };
    });
  }

  /**
   * Dashboard completo - todas as seções numa chamada
   */
  static async getDashboardCompleto() {
    const [
      resumo,
      faturamentoSemanal,
      pedidosPorCategoria,
      maisVendidos,
      pedidosRecentes,
    ] = await Promise.all([
      this.getResumo(),
      this.getFaturamentoSemanal(),
      this.getPedidosPorCategoria(),
      this.getMaisVendidos(5),
      this.getPedidosRecentes(5),
    ]);

    return {
      resumo,
      faturamentoSemanal,
      pedidosPorCategoria,
      maisVendidos,
      pedidosRecentes,
    };
  }
};