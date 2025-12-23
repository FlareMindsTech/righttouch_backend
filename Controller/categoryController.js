import Category from "../Schemas/Category.js";

export const serviceCategory = async (req, res) => {
  try {
    const { category, description, image } = req.body;

    if (!category || !description || !image) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        result: "Missing required fields"
      });
    }

    const matchCategory = await Category.findOne({ category });
    if (matchCategory) {
      return res.status(409).json({
        success: false,
        message: "Category name already registered",
        result: "Duplicate category found"
      });
    }

    const categoryData = await Category.create({
      category,
      description,
      image,
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      result: categoryData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      result: error.message
    });
  }
};

// Get All Category WIth Filter
export const getAllCategory = async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    const categories = await Category.find(query);

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No categories data found",
        result: "No categories match the search criteria"
      });
    }
    return res.status(200).json({ success: true, message: "Categories fetched successfully", result: categories });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", result: error.message });
  }
};

// Get by ID
export const getByIdCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found", result: "No category exists with this ID" });
    return res.status(200).json({ success: true, message: "Category fetched successfully", result: category });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", result: error.message });
  }
};

// Update Category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description, image } = req.body;

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { category, description, image },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ success: false, message: "Category not found", result: "No category exists with this ID" });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      result: updatedCategory
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", result: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found", result: "No category exists with this ID" });

    res.status(200).json({ success: true, message: "Category deleted successfully", result: "Category has been deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", result: error.message });
  }
};
