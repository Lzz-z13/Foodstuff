const ProductService = require("../services/productService");
const CategoryService = require("../services/categoryService");
const CommandService = require("../services/commandService");
const OrderService = require("../services/orderService");
const validateProductId = require("../validations/validateProductId");
const validateSessionToken = require("../validations/validateSessionToken");
const validateOrder = require("../validations/validateOrder");

function toPublicProduct(product) {
  const { cost, is_active, ...publicProduct } = product;

  return publicProduct;
}

module.exports = class PublicController {
  static async readProducts(req, res, next) {
    try {
      const { category_id, search } = req.query;

      const products = await ProductService.readAllProducts({
        category_id,
        search,
        is_available: 1,
        include_inactive: false,
      });

      return res.status(200).json({
        error: false,
        message: "Produtos buscados com sucesso.",
        data: products.map(toPublicProduct),
      });
    } catch (error) {
      next(error);
    }
  }

  static async readProductById(req, res, next) {
    const { product_id } = req.params;

    try {
      validateProductId(product_id);

      const product = await ProductService.readProductById(product_id);

      if (
        Number(product.is_active) !== 1 ||
        Number(product.is_available) !== 1
      ) {
        throw { status: 404, message: "Produto não encontrado." };
      }

      return res.status(200).json({
        error: false,
        message: "Produto encontrado com sucesso.",
        data: toPublicProduct(product),
      });
    } catch (error) {
      next(error);
    }
  }

  static async readCategories(req, res, next) {
    try {
      const categories = await CategoryService.readAllCategories(false);

      return res.status(200).json({
        error: false,
        message: "Categorias buscadas com sucesso.",
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async readCommandBySession(req, res, next) {
    const { session_token } = req.params;

    try {
      validateSessionToken(session_token);

      const command = await CommandService.readCommandBySession(session_token);

      return res.status(200).json({
        error: false,
        message: "Comanda encontrada com sucesso.",
        data: command,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createOrderBySession(req, res, next) {
    const { session_token } = req.params;
    const items = req.body?.items;

    try {
      validateSessionToken(session_token);
      validateOrder({ items });

      const result = await OrderService.createCustomerOrderBySession(
        session_token,
        items,
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
};
