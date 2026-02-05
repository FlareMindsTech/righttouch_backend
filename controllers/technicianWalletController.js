import TechnicianProfile from "../Schemas/TechnicianProfile.js";
import WalletTransaction from "../Schemas/WalletTransaction.js";
import WithdrawRequest from "../Schemas/WithdrawRequest.js";

/* 🔐 Technician only */
const ensureTechnician = (req) => {
  if (req.user?.role !== "Technician") {
    const err = new Error("Technician access only");
    err.statusCode = 403;
    throw err;
  }
};

/* GET WALLET BALANCE */
export const getTechnicianWallet = async (req, res) => {
  ensureTechnician(req);

  const tech = await TechnicianProfile.findById(req.user.profileId);
  res.json({
    success: true,
    balance: tech?.walletBalance || 0
  });
};

/* GET WALLET TRANSACTIONS */
export const getWalletTransactions = async (req, res) => {
  ensureTechnician(req);

  const txns = await WalletTransaction.find({
    technicianId: req.user.profileId
  }).sort({ createdAt: -1 });

  res.json({ success: true, result: txns });
};

/* REQUEST WITHDRAW */
export const requestWithdraw = async (req, res) => {
  ensureTechnician(req);

  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: "Invalid amount" });
  }

  const tech = await TechnicianProfile.findById(req.user.profileId);
  if (tech.walletBalance < amount) {
    return res.status(400).json({ success: false, message: "Insufficient balance" });
  }

  const withdraw = await WithdrawRequest.create({
    technicianId: req.user.profileId,
    amount
  });

  res.json({ success: true, message: "Withdraw request sent", result: withdraw });
};

/* MY WITHDRAW REQUESTS */
export const getMyWithdrawRequests = async (req, res) => {
  ensureTechnician(req);

  const data = await WithdrawRequest.find({
    technicianId: req.user.profileId
  }).sort({ createdAt: -1 });

  res.json({ success: true, result: data });
};

/* ================= CANCEL MY WITHDRAW ================= */
export const cancelMyWithdrawal = async (req, res) => {
  try {
    if (req.user?.role !== "Technician") {
      return res.status(403).json({
        success: false,
        message: "Technician access only"
      });
    }

    const { id } = req.params;

    const withdraw = await WithdrawRequest.findOne({
      _id: id,
      technicianId: req.user.profileId,
      status: "pending"
    });

    if (!withdraw) {
      return res.status(404).json({
        success: false,
        message: "Pending withdraw request not found"
      });
    }

    withdraw.status = "rejected";
    withdraw.rejectedAt = new Date();
    withdraw.adminNote = "Cancelled by technician";
    await withdraw.save();

    return res.json({
      success: true,
      message: "Withdraw request cancelled successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};