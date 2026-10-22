const OrderService = require("../services/orderService");

module.exports = class OrderController {
  static async readOrders(req, res, next) {
    try {
      const orders = await OrderService.readOrders();
      return res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
  }

  static async readOrderById(req, res, next) {
    const { order_id } = req.params;

    try {
      const order = await OrderService.readOrderById(order_id);
      return res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req, res, next) {
    const { order_id } = req.params;
    const { status } = req.body;

    try {
      const result = await OrderService.updateOrderStatus(order_id, status);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async requestAccount(req, res, next) {
    const { order_id } = req.params;

    try {
      const result = await OrderService.requestAccount(order_id);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};
