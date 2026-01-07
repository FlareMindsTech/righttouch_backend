import WalletTransaction from "../Schemas/TechnicianWallet.js";

// Add Wallet Transaction
export const createWalletTransaction = async (req, res) => {
  try {
    const { technicianId, bookingId, amount, type, source } = req.body;

    if (!technicianId || !amount || !type || !source) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        result: {},
      });
    }

    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
        result: {},
      });
    }

    if (!["job", "penalty"].includes(source)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction source",
        result: {},
      });
    }

    if (amount <= 0) {
      
      return res.status(400).json({
        success: false,
        message: "Amount must be positive",
        result: {},
      });
    }

    const transaction = await WalletTransaction.create({
      technicianId,
      bookingId,
      amount,
      type,
      source,
    });

    res.status(201).json({
      success: true,
      message: "Wallet transaction recorded",
      result: transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, result: {} });
  }
};

// Get Technician Wallet History
export const getWalletHistory = async (req, res) => {
  try {
    const technicianId = req.user.userId; // Use authenticated user's ID

    const history = await WalletTransaction.find({ technicianId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Wallet history fetched successfully",
      result: history,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, result: {} });
  }
};
