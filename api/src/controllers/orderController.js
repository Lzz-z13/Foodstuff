const OrderService = require("../services/orderService");
const validateCommandId = require("../validations/validateCommandId");
const validateOrder = require("../validations/validateOrder");

module.exports = class OrderController {
  static async createOrder(req, res, next) {
    const jwt_user_id = req.user.id;
    const { command_id } = req.params;
    const items = req.body?.items;

    try {
      validateCommandId(command_id);
      validateOrder({ items });

      const result = await OrderService.createOrder(
        command_id,
        req.body.items,
        jwt_user_id,
      );

      return res.status(201).json({
        error: false,
        message: "Pedido criado com sucesso.",
        data: {
          order_id: result.order_id,
        },
      });
    } catch (error) {
      next(error);
    }
  }
};
