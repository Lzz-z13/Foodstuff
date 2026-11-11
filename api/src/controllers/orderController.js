const OrderService = require("../services/orderService");
const validateCommandId = require("../validations/validateCommandId");
const validateOrder = require("../validations/validateOrder");
const validateOrderId = require("../validations/validateOrderId");
const validateOrderStatus = require("../validations/validateOrderStatus");

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
        items,
        jwt_user_id,
      );

      return res.status(201).json({
        error: false,
        message: "Pedido criado com sucesso.",
        data: {
          order_id: result.order_id,
          status: result.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async readOrders(req, res, next) {
    try {
      const orders = await OrderService.readOrders();
      return res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
  }

  static async readAllOrders(req, res, next) {
    try {
      const orders = await OrderService.readAllOrders();

      return res.status(200).json({
        error: false,
        message: "Pedidos buscados com sucesso.",
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  static async readOrderById(req, res, next) {
    const { order_id } = req.params;

    try {
      validateOrderId(order_id);

      const order = await OrderService.readOrderById(order_id);

      return res.status(200).json({
        error: false,
        message: "Pedido encontrado com sucesso.",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req, res, next) {
    const jwt_user_id = req.user.id;
    const { order_id } = req.params;
    const { status } = req.body ?? {};

    try {
      validateOrderId(order_id);
      validateOrderStatus(status);

      const result = await OrderService.updateOrderStatus(
        order_id,
        status,
        jwt_user_id,
      );

      return res.status(200).json({
        error: false,
        message: "Status do pedido atualizado com sucesso.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async requestAccount(req, res, next) {
    const jwt_user_id = req.user.id;
    const { order_id } = req.params;

    try {
      validateOrderId(order_id);

      const result = await OrderService.requestAccount(order_id, jwt_user_id);

      return res.status(200).json({
        error: false,
        message: "Conta solicitada com sucesso.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
};
