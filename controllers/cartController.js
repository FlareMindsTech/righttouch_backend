import Cart from "../Schemas/Cart.js";
import Product from "../Schemas/Product.js";
import Service from "../Schemas/Service.js";

/* ================= ADD TO CART ================= */
export const addToCart = async (req, res) => {
  try {
    const { itemId, itemType, quantity = 1 } = req.body;
    const userId = req.user.userId;

    if (!itemId || !itemType) {
      return res.status(400).json({
        success: false,
        message: "Item ID and item type are required",
      });
    }

    if (!["product", "service"].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type. Must be 'product' or 'service'",
      });
    }

    // Check if item exists
    let item;
    if (itemType === "product") {
      item = await Product.findById(itemId);
    } else {
      item = await Service.findById(itemId);
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${itemType} not found`,
      });
    }

    // Add or update cart item
    const cartItem = await Cart.findOneAndUpdate(
      { userId, itemType, itemId },
      { quantity },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: `${itemType} added to cart`,
      data: cartItem,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= GET MY CART ================= */
export const getMyCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cartItems = await Cart.find({ userId });

    // Populate items based on type
    const populatedItems = await Promise.all(
      cartItems.map(async (item) => {
        let populatedItem;
        if (item.itemType === "product") {
          populatedItem = await Product.findById(item.itemId);
        } else {
          populatedItem = await Service.findById(item.itemId);
        }
        return {
          ...item.toObject(),
          item: populatedItem,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: populatedItems,
    });
  } catch (error) {
    console.error("Get my cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= UPDATE CART ITEM ================= */
export const updateCartItem = async (req, res) => {
  try {
    const { itemId, itemType, quantity } = req.body;
    const userId = req.user.userId;

    if (!itemId || !itemType || quantity == null) {
      return res.status(400).json({
        success: false,
        message: "Item ID, item type, and quantity are required",
      });
    }

    if (!["product", "service"].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type. Must be 'product' or 'service'",
      });
    }

    if (quantity <= 0) {
      // If quantity is 0 or negative, remove the item
      await Cart.findOneAndDelete({ userId, itemType, itemId });
      return res.status(200).json({
        success: true,
        message: "Item removed from cart",
      });
    }

    const cartItem = await Cart.findOneAndUpdate(
      { userId, itemType, itemId },
      { quantity },
      { new: true }
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart item updated",
      data: cartItem,
    });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= GET CART BY ID ================= */
export const getCartById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const cartItem = await Cart.findOne({ _id: id, userId });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    // Populate the item
    let item;
    if (cartItem.itemType === "product") {
      item = await Product.findById(cartItem.itemId);
    } else {
      item = await Service.findById(cartItem.itemId);
    }

    res.status(200).json({
      success: true,
      data: {
        ...cartItem.toObject(),
        item,
      },
    });
  } catch (error) {
    console.error("Get cart by id error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= UPDATE CART BY ID ================= */
export const updateCartById = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;

    if (quantity == null) {
      return res.status(400).json({
        success: false,
        message: "Quantity is required",
      });
    }

    if (quantity <= 0) {
      // Remove the item
      const deletedItem = await Cart.findOneAndDelete({ _id: id, userId });
      if (!deletedItem) {
        return res.status(404).json({
          success: false,
          message: "Cart item not found",
        });
      }
      return res.status(200).json({
        success: true,
        message: "Cart item removed",
      });
    }

    const cartItem = await Cart.findOneAndUpdate(
      { _id: id, userId },
      { quantity },
      { new: true }
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart item updated",
      data: cartItem,
    });
  } catch (error) {
    console.error("Update cart by id error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= REMOVE FROM CART ================= */
export const removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const cartItem = await Cart.findOneAndDelete({ _id: id, userId });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};