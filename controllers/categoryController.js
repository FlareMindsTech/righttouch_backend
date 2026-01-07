import Category from "../Schemas/Category.js";

/* ================= CREATE CATEGORY (NO IMAGE) ================= */
export const serviceCategory = async (req, res) => {
  try {
    const { category, description, categoryType } = req.body;

    if (!category || !description || !categoryType) {
      return res.status(400).json({
        success: false,
        message: "Category, description & categoryType are required",
        result: {},
      });
    }

    if (!["service", "product"].includes(categoryType)) {
      return res.status(400).json({
        success: false,
        message: "categoryType must be 'service' or 'product'",
        result: {},
      });
    }

    // Duplicate check (case-insensitive)
    const existing = await Category.findOne({
      category: { $regex: `^${category}$`, $options: "i" },
      categoryType,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Category already exists for this type",
        result: {},
      });
    }

    const categoryData = await Category.create({
      category,
      description,
      categoryType,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      result: categoryData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

/* ================= UPLOAD CATEGORY IMAGE ================= */
export const uploadCategoryImage = async (req, res) => {
  try {
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
        result: {},
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Category image is required",
        result: {},
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
        result: {},
      });
    }

    category.image = req.file.path;
    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category image uploaded successfully",
      result: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

/* ================= GET ALL CATEGORIES ================= */
export const getAllCategory = async (req, res) => {
  try {
    const { search, categoryType } = req.query;
    let query = {};

    if (categoryType) {
      if (!["service", "product"].includes(categoryType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryType. Must be 'service' or 'product'",
          result: {},
        });
      }
      query.categoryType = categoryType;
    }

    if (search) {
      query.$or = [
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const categories = await Category.find(query);

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      result: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

/* ================= GET CATEGORY BY ID ================= */
export const getByIdCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
        result: {},
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      result: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

/* ================= UPDATE CATEGORY (TEXT ONLY) ================= */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description, categoryType } = req.body;

    if (category) {
      const existing = await Category.findOne({
        category: { $regex: `^${category}$`, $options: "i" },
        _id: { $ne: id },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Category name already exists",
          result: {},
        });
      }
    }

    if (categoryType && !["service", "product"].includes(categoryType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid categoryType. Must be 'service' or 'product'",
        result: {},
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { category, description, categoryType },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
        result: {},
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      result: updatedCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};

/* ================= DELETE CATEGORY ================= */
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
        result: {},
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      result: {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      result: {},
    });
  }
};
