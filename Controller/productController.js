import Product from "../Schemas/Product.js";

export const product = async (req, res) => {
  try {
    const {
      productName,
      productDescription,
      productPrice,
      productDiscountPrice,
      productImage,
      productBrand,
      productFeatures,
      status,
      warranty,
    } = req.body;

    if (!productName || !productDescription || !productPrice || !productDiscountPrice) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const matchProduct = await Product.findOne({ productName });
    if (matchProduct) {
      return res.status(400).json({
        message: "Product already registered",
      });
    }

    const productData = await Product.create({
      productName,
      productDescription,
      productPrice,
      productDiscountPrice,
      productImage,
      productBrand,
      productFeatures,
      status,
      warranty,
    });

    res.status(201).json({
      message: "Product created successfully",
      data: productData,
    });

  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};


export const getProduct = async (req , res)=>{
    try {
        const getProduct = await Product.find();
        if(!getProduct){
            res.status(400).json({
                message : "No Product"
            })
        }
        res.status(200).json({
            message : "Fetch data successfully",
            data : getProduct
        })
    } catch (error) {
        res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
    }
}

export const getOneProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const getOneProduct = await Product.findById(id);

    if (!getOneProduct) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.status(200).json({
      message: "Fetch data successfully",
      data: getOneProduct
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
};


