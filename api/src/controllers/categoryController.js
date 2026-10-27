const CategoryService = require("../services/categoryService");
const validateCategory = require("../validations/validateCategory");
const validateCategoryId = require("../validations/validateCategoryId");

module.exports = class CategoryController {
  static async createCategory(req, res, next) {
    const jwt_user_id = req.user.id;
    const { name, description } = req.body;

    try {
      validateCategory(req.body, false);

      const result = await CategoryService.createCategory(
        name,
        description,
        jwt_user_id,
      );

      return res.status(201).json({
        error: false,
        message: result.message,
        data: { category_id: result.category_id },
      });
    } catch (error) {
      next(error);
    }
  }

  static async readAllCategories(req, res, next) {
    try {
      const includeInactive = req.query.include_inactive === "1";
      const categories =
        await CategoryService.readAllCategories(includeInactive);

      return res.status(200).json({
        error: false,
        message: "Categorias buscadas com sucesso.",
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req, res, next) {
    const jwt_user_id = req.user.id;
    const { category_id } = req.params;
    const { name, description } = req.body;

    try {
      validateCategoryId(category_id);
      validateCategory(req.body, true);

      const result = await CategoryService.updateCategory(
        category_id,
        { name, description },
        jwt_user_id,
      );

      return res.status(200).json({
        error: false,
        message: result.message,
        data: { category_id: result.category_id },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req, res, next) {
    const jwt_user_id = req.user.id;
    const { category_id } = req.params;

    try {
      validateCategoryId(category_id);

      const result = await CategoryService.deleteCategory(
        category_id,
        jwt_user_id,
      );

      return res.status(200).json({
        error: false,
        message: result.message,
        data: { category_id: result.category_id },
      });
    } catch (error) {
      next(error);
    }
  }
};
