import Address from "../Schemas/Address.js";

/* ================= CREATE ADDRESS ================= */
export const createAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { label, name, phone, addressLine, city, state, pincode, latitude, longitude, isDefault } = req.body;

    // Validate required fields
    if (!addressLine) {
      return res.status(400).json({
        success: false,
        message: "Address line is required",
        result: {},
      });
    }

    // If setting as default, unset other defaults for this user
    if (isDefault) {
      await Address.updateMany({ userId }, { isDefault: false });
    }

    const address = await Address.create({
      userId,
      label: label || "home",
      name,
      phone,
      addressLine,
      city,
      state,
      pincode,
      latitude,
      longitude,
      isDefault: isDefault || false,
    });

    res.status(201).json({
      success: true,
      message: "Address created successfully",
      result: address,
    });
  } catch (error) {
    console.error("Create address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create address",
      result: {},
    });
  }
};

/* ================= GET ALL ADDRESSES ================= */
export const getMyAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const addresses = await Address.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Addresses fetched successfully",
      result: addresses,
    });
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
      result: {},
    });
  }
};

/* ================= GET SINGLE ADDRESS ================= */
export const getAddressById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const address = await Address.findOne({ _id: id, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
        result: {},
      });
    }

    res.status(200).json({
      success: true,
      message: "Address fetched successfully",
      result: address,
    });
  } catch (error) {
    console.error("Get address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch address",
      result: {},
    });
  }
};

/* ================= UPDATE ADDRESS ================= */
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { label, name, phone, addressLine, city, state, pincode, latitude, longitude, isDefault } = req.body;

    // Check if address exists and belongs to user
    const address = await Address.findOne({ _id: id, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
        result: {},
      });
    }

    // If setting as default, unset other defaults
    if (isDefault && !address.isDefault) {
      await Address.updateMany({ userId, _id: { $ne: id } }, { isDefault: false });
    }

    // Update address
    const updatedAddress = await Address.findByIdAndUpdate(
      id,
      {
        label: label || address.label,
        name: name || address.name,
        phone: phone || address.phone,
        addressLine: addressLine || address.addressLine,
        city: city || address.city,
        state: state || address.state,
        pincode: pincode || address.pincode,
        latitude: latitude !== undefined ? latitude : address.latitude,
        longitude: longitude !== undefined ? longitude : address.longitude,
        isDefault: isDefault !== undefined ? isDefault : address.isDefault,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      result: updatedAddress,
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update address",
      result: {},
    });
  }
};

/* ================= DELETE ADDRESS ================= */
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const address = await Address.findOneAndDelete({ _id: id, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
        result: {},
      });
    }

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      result: {},
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
      result: {},
    });
  }
};

/* ================= SET DEFAULT ADDRESS ================= */
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Check if address exists and belongs to user
    const address = await Address.findOne({ _id: id, userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
        result: {},
      });
    }

    // Unset all other defaults
    await Address.updateMany({ userId, _id: { $ne: id } }, { isDefault: false });

    // Set this as default
    const updatedAddress = await Address.findByIdAndUpdate(
      id,
      { isDefault: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Default address updated",
      result: updatedAddress,
    });
  } catch (error) {
    console.error("Set default address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set default address",
      result: {},
    });
  }
};

/* ================= GET DEFAULT ADDRESS ================= */
export const getDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.userId;

    const address = await Address.findOne({ userId, isDefault: true });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "No default address set",
        result: {},
      });
    }

    res.status(200).json({
      success: true,
      message: "Default address fetched successfully",
      result: address,
    });
  } catch (error) {
    console.error("Get default address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch default address",
      result: {},
    });
  }
};
