const router = require("express").Router();
const verifyRole = require("../middlewares/verifyRole");

const DashboardController = require("../controllers/dashboardController");

// Dashboard completo (tudo num request só)
router.get(
  "/",
  verifyRole("MANAGER"),
  DashboardController.getDashboard
);

// Endpoints individuais (úteis para lazy loading ou refresh parcial)
router.get(
  "/resumo",
  verifyRole("MANAGER"),
  DashboardController.getResumo
);

router.get(
  "/faturamento-semanal",
  verifyRole("MANAGER"),
  DashboardController.getFaturamentoSemanal
);

router.get(
  "/pedidos-por-categoria",
  verifyRole("MANAGER"),
  DashboardController.getPedidosPorCategoria
);

router.get(
  "/mais-vendidos",
  verifyRole("MANAGER"),
  DashboardController.getMaisVendidos
);

router.get(
  "/pedidos-recentes",
  verifyRole("MANAGER"),
  DashboardController.getPedidosRecentes
);

module.exports = router;