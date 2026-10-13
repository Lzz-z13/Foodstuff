const ProductService = require("../services/productService");
const validateProduct = require("../validations/validateProduct");
const validateProductId = require("../validations/validateProductId");

module.exports = class ProductController {
  static async createProduct(req, res, next) {
    const jwt_user_id = req.user.id;

    try {
      validateProduct(req.body, false);

      const result = await ProductService.createProduct(
        req.body,
        jwt_user_id,
      );

      return res.status(201).json({
        error: false,
        message: result.message,
        data: { product_id: result.product_id },
      });
    } catch (error) {
      next(error);
    }
  }

  static async readAllProducts(req, res, next) {
    try {
      const { category_id, search, is_available, include_inactive } = req.query;

      const products = await ProductService.readAllProducts({
        category_id,
        search,
        is_available,
        include_inactive: include_inactive === "1",
      });

      return res.status(200).json({
        error: false,
        message: "Produtos buscados com sucesso.",
        data: products,
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

      return res.status(200).json({
        error: false,
        message: "Produto encontrado com sucesso.",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req, res, next) {
    const jwt_user_id = req.user.id;
    const { product_id } = req.params;

    try {
      validateProductId(product_id);
      validateProduct(req.body, true);

      const result = await ProductService.updateProduct(
        product_id,
        req.body,
        jwt_user_id,
      );

      return res.status(200).json({
        error: false,
        message: result.message,
        data: { product_id: result.product_id },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAvailability(req, res, next) {
    const jwt_user_id = req.user.id;
    const { product_id } = req.params;
    const { is_available } = req.body;

    try {
      validateProductId(product_id);

      if (is_available === undefined) {
        throw {
          status: 400,
          message: "Todos os campos devem ser preenchidos.",
        };
      }

      const result = await ProductService.updateAvailability(
        product_id,
        is_available,
        jwt_user_id,
      );

      return res.status(200).json({
        error: false,
        message: result.message,
        data: {
          product_id: result.product_id,
          is_available: result.is_available,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req, res, next) {
    const jwt_user_id = req.user.id;
    const { product_id } = req.params;

    try {
      validateProductId(product_id);

      const result = await ProductService.deleteProduct(
        product_id,
        jwt_user_id,
      );

      return res.status(200).json({
        error: false,
        message: result.message,
        data: { product_id: result.product_id },
      });
    } catch (error) {
      next(error);
    }
  }
};
