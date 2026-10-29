const DashboardService = require("../services/dashboardService");

module.exports = class DashboardController {
  static async getDashboard(req, res, next) {
    try {
      const dashboard = await DashboardService.getDashboardCompleto();

      return res.status(200).json({
        error: false,
        message: "Dashboard carregado com sucesso.",
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getResumo(req, res, next) {
    try {
      const resumo = await DashboardService.getResumo();

      return res.status(200).json({
        error: false,
        message: "Resumo carregado com sucesso.",
        data: resumo,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFaturamentoSemanal(req, res, next) {
    try {
      const dados = await DashboardService.getFaturamentoSemanal();

      return res.status(200).json({
        error: false,
        message: "Faturamento semanal carregado com sucesso.",
        data: dados,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPedidosPorCategoria(req, res, next) {
    try {
      const dados = await DashboardService.getPedidosPorCategoria();

      return res.status(200).json({
        error: false,
        message: "Pedidos por categoria carregados com sucesso.",
        data: dados,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMaisVendidos(req, res, next) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 5;
      const dados = await DashboardService.getMaisVendidos(limit);

      return res.status(200).json({
        error: false,
        message: "Mais vendidos carregados com sucesso.",
        data: dados,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPedidosRecentes(req, res, next) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 5;
      const dados = await DashboardService.getPedidosRecentes(limit);

      return res.status(200).json({
        error: false,
        message: "Pedidos recentes carregados com sucesso.",
        data: dados,
      });
    } catch (error) {
      next(error);
    }
  }
};