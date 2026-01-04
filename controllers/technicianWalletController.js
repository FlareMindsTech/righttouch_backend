import WalletTransaction from "../Schemas/TechnicianWallet.js";

// Add Wallet Transaction
export const createWalletTransaction = async (req, res) => {
  try {
    const { technicianId, bookingId, amount, type, source } = req.body;

    if (!technicianId || !amount || !type || !source) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    if (!["job", "penalty"].includes(source)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction source",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be positive",
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Technician Wallet History
export const getWalletHistory = async (req, res) => {
  try {
    const technicianId = req.user.userId; // Use authenticated user's ID

    const history = await WalletTransaction.find({ technicianId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      result: history,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
