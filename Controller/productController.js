import Product from "../Schemas/Product.js";

export const product = async (req, res) => {
  try {
    const {
      productName,
      productDescription,
      productPrice,
      productDiscountPercentage,
      productGst,
      productCount,
      inStock,
      productImage,
      productBrand,
      productFeatures,
      warranty,
    } = req.body;

    // validation
    if (
      !productName ||
      !productDescription ||
      !productPrice ||
      !productDiscountPercentage ||
      !productGst ||
      inStock === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        result: "Missing required fields"
      });
    }

    // check product duplication
    const matchProduct = await Product.findOne({ productName });
    if (matchProduct) {
      return res.status(400).json({
        success: false,
        message: "Product already registered",
        result: "Duplicate product found"
      });
    }

    // create product
    const productData = await Product.create({
      productName,
      productDescription,
      productPrice,
      productDiscountPercentage,
      productGst,
      productCount,
      inStock,
      productImage,
      productBrand,
      productFeatures,
      warranty,
      status: inStock === 0 ? "Unavailable" : "Available",
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      result: productData
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getProduct = async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};

    if (search) {
      // Try converting search to number
      const searchAsNumber = Number(search);

      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { productDescription: { $regex: search, $options: "i" } },
        { productBrand: { $regex: search, $options: "i" } },
        { warranty: { $regex: search, $options: "i" } },
      ];

      // If search is a valid number, also search in price
      if (!isNaN(searchAsNumber)) {
        query.$or.push({ productPrice: searchAsNumber });
      }
    }

    const getProduct = await Product.find(query);

    if (getProduct.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No product data found",
        result: "No products match the search criteria"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fetch data successfully",
      result: getProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      result: error.message
    });
  }
};

export const getOneProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const getOneProduct = await Product.findById(id);

    if (!getOneProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        result: "No product exists with this ID"
      });
    }

    res.status(200).json({
      success: true,
      message: "Fetch data successfully",
      result: getOneProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      result: error.message
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteProductDate = await Product.findByIdAndDelete(id);
    if (!deleteProductDate) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
        result: "No product exists with this ID"
      });
    }

    res.status(200).json({
      success: true,
      message: "successfully delete product",
      result: "Product has been deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      result: error.message
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    // req.body exists
    if (!req.body) {
      return res.status(400).json({ success: false, message: "No data provided to update", result: "Missing request body" });
    }

    const {
      productName,
      productDescription,
      productPrice,
      productDiscountPercentage,
      productGst,
      productCount,
      inStock,
      productImage,
      productBrand,
      productFeatures,
      warranty,
    } = req.body;

    // Discount calculation
    let discountAmount = 0;
    let discountedPrice = productPrice;

    if (productDiscountPercentage > 0) {
      discountAmount = (productPrice * productDiscountPercentage) / 100;
      discountedPrice = productPrice - discountAmount;
    }

    // GST calculation
    const gstAmount = (discountedPrice * productGst) / 100;
    const finalPrice = discountedPrice + gstAmount;

    // Update product
    const updateData = await Product.findByIdAndUpdate(
      req.params.id,
      {
        productName,
        productDescription,
        productPrice,
        productDiscountPercentage,
        productGst,
        productCount,
        inStock,
        productImage,
        productBrand,
        productFeatures,
        warranty,
        status: inStock === 0 ? "Unavailable" : "Available",
        discountAmount,
        discountedPrice,
        gstAmount,
        finalPrice,
      },
      { new: true, runValidators: true } // return updated doc & validate
    );

    if (!updateData) {
      return res.status(404).json({ success: false, message: "No Product Found", result: "No product exists with this ID" });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      result: updateData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      result: error.message
    });
  }
};
