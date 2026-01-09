import Cart from "../Schemas/Cart.js";
import Product from "../Schemas/Product.js";
import Service from "../Schemas/Service.js";
import ServiceBooking from "../Schemas/ServiceBooking.js";
import ProductBooking from "../Schemas/ProductBooking.js";
import Address from "../Schemas/Address.js";

/* ================= ADD TO CART ================= */
export const addToCart = async (req, res) => {
  try {
    const { itemId, itemType, quantity = 1 } = req.body;
    const userId = req.user.userId;

    if (!itemId || !itemType) {
      return res.status(400).json({
        success: false,
        message: "Item ID and item type are required",
        result: {},
      });
    }

    if (!["product", "service"].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type. Must be 'product' or 'service'",
        result: {},
      });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
        result: {},
      });
    }

    // Check if item exists
    const item =
      itemType === "product"
        ? await Product.findById(itemId)
        : await Service.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `${itemType} not found`,
        result: {},
      });
    }

    // Add or update cart item
    const cartItem = await Cart.findOneAndUpdate(
      { userId, itemType, itemId },
      { quantity },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: `${itemType} added to cart`,
      result: cartItem,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      result: {error: error.message},
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
      message: "Cart fetched successfully",
      result: populatedItems,
    });
  } catch (error) {
    console.error("Get my cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      result: {error: error.message},
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
        result: {},
      });
    }

    if (!["product", "service"].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type. Must be 'product' or 'service'",
        result: {},
      });
    }

    if (!Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be an integer",
        result: {},
      });
    }

    if (quantity <= 0) {
      // If quantity is 0 or negative, remove the item
      await Cart.findOneAndDelete({ userId, itemType, itemId });
      return res.status(200).json({
        success: true,
        message: "Item removed from cart",
        result: {},
      });
    }

    const cartItem = await Cart.findOneAndUpdate(
      { userId, itemType, itemId },
      { quantity },
      { new: true, runValidators: true }
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
        result: {},
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart item updated",
      result: cartItem,
    });
  } catch (error) {
    console.error("Update cart item error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      result: {error: error.message},
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
        result: {},
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
      message: "Cart item fetched",
      result: {
        ...cartItem.toObject(),
        item,
      },
    });
  } catch (error) {
    console.error("Get cart by id error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      result: {error: error.message},
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
        result: {},
      });
    }

    if (!Number.isInteger(quantity)) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be an integer",
        result: {},
      });
    }

    if (quantity <= 0) {
      // Remove the item
      const deletedItem = await Cart.findOneAndDelete({ _id: id, userId });
      if (!deletedItem) {
        return res.status(404).json({
          success: false,
          message: "Cart item not found",
          result: {},
        });
      }
      return res.status(200).json({
        success: true,
        message: "Cart item removed",
        result: {},
      });
    }

    const cartItem = await Cart.findOneAndUpdate(
      { _id: id, userId },
      { quantity },
      { new: true, runValidators: true }
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
        result: {},
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart item updated",
      result: cartItem,
    });
  } catch (error) {
    console.error("Update cart by id error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      result: {error: error.message},
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
        result: {},
      });
    }

    res.status(200).json({
      success: true,
      message: "Item removed from cart",
      result: {},
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      result: {error: error.message},
    });
  }
};

/* ================= CHECKOUT ================= */
export const checkout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId, paymentMode, scheduledAt } = req.body;

    // Validate required fields
    if (!addressId || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: "Address ID and payment mode are required",
        result: {},
      });
    }

    // Validate payment mode
    if (!["online", "cod"].includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Payment mode must be 'online' or 'cod'",
        result: {},
      });
    }

    // Get address - verify it belongs to this user
    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found or does not belong to you",
        result: {},
      });
    }

    // Get all cart items for the user
    const cartItems = await Cart.find({ userId });

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
        result: {},
      });
    }

    // Separate services and products
    const serviceItems = cartItems.filter((item) => item.itemType === "service");
    const productItems = cartItems.filter((item) => item.itemType === "product");

    const bookingResults = {
      address: {
        _id: address._id,
        name: address.name,
        phone: address.phone,
        addressLine: address.addressLine,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
      serviceBookings: [],
      productBookings: [],
      totalAmount: 0,
      paymentMode,
    };

    // Create Service Bookings
    for (const cartItem of serviceItems) {
      const service = await Service.findById(cartItem.itemId);

      if (!service) {
        return res.status(404).json({
          success: false,
          message: `Service not found: ${cartItem.itemId}`,
          result: {},
        });
      }

      // Calculate amount
      const baseAmount = service.serviceCost * cartItem.quantity;

      const serviceBooking = await ServiceBooking.create({
        customerId: userId,
        serviceId: cartItem.itemId,
        baseAmount,
        address: address.addressLine,
        scheduledAt: scheduledAt || new Date(),
        status: "broadcasted",
      });

      bookingResults.serviceBookings.push({
        bookingId: serviceBooking._id,
        serviceId: cartItem.itemId,
        serviceName: service.serviceName,
        quantity: cartItem.quantity,
        baseAmount,
        status: "broadcasted",
      });

      bookingResults.totalAmount += baseAmount;
    }

    // Create Product Bookings
    for (const cartItem of productItems) {
      const product = await Product.findById(cartItem.itemId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${cartItem.itemId}`,
          result: {},
        });
      }

      // Calculate amount with discount and GST
      const basePrice = product.productPrice * cartItem.quantity;
      const discountAmount =
        (basePrice * (product.productDiscountPercentage || 0)) / 100;
      const discountedPrice = basePrice - discountAmount;
      const gstAmount = (discountedPrice * (product.productGst || 0)) / 100;
      const finalAmount = discountedPrice + gstAmount;

      const productBooking = await ProductBooking.create({
        productId: cartItem.itemId,
        userId,
        amount: finalAmount,
        paymentStatus: paymentMode === "online" ? "pending" : "pending",
        status: "active",
      });

      bookingResults.productBookings.push({
        bookingId: productBooking._id,
        productId: cartItem.itemId,
        productName: product.productName,
        quantity: cartItem.quantity,
        basePrice,
        discount: discountAmount,
        gst: gstAmount,
        finalAmount,
        paymentStatus: "pending",
      });

      bookingResults.totalAmount += finalAmount;
    }

    // Clear the cart only after all bookings are created successfully
    await Cart.deleteMany({ userId });

    res.status(201).json({
      success: true,
      message: "Checkout completed successfully",
      result: bookingResults,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({
      success: false,
      message: "Checkout failed: " + error.message,
      result: {error: error.message},
    });
  }
};
