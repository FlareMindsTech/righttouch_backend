import Category from "../Schemas/category.js";



// ********user category  **************
export const serviceCategory = async (req , res)=>{
  try {
    const { category, description, image} = req.body;

    if( !category, !description, !image){
      return res.status(200).json({
        message : "All field is required"
      })
    }

    const matchCategory = await Category.findOne({category});

    if(matchCategory){
      return res.status(208).json({
        message :"Category name already register"
      })
    }

    const categoryData = await Category.create({
      category, 
      description, 
      image
    });
    await categoryData.save();

    res.status(200).json({
      message : "category create successfully..."
    });
  } catch (error) {
        res.status(500).json({ 
          message: "Server error", error: error.message 
        });
  }
}

// ********user category  end**************
// Get All Categories
export const getAllCategory = async (req, res) => {
  try {
    const categories = await categorySchema.find();
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get by ID
export const getByIdCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categorySchema.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    return res.status(200).json(category);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description, image } = req.body;

    const updatedCategory = await categorySchema.findByIdAndUpdate(
      id,
      { category, description, image },
      { new: true, runValidators: true }
    );

    if (!updatedCategory)
      return res.status(404).json({ message: "Category not found" });
    return res
      .status(200)
      .json({ message: "Category updated successfully", Category: updatedCategory });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete Category by ID
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categorySchema.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};