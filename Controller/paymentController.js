import Payment from "../Schemas/Payment.js";
import ExtraWork from "../Schemas/ExtraWork.js";
import ServiceBooking from "../Schemas/ServiceBooking.js";

// Create Payment
export const createPayment = async (req, res) => {
  try {
    const { bookingId, baseAmount, paymentMode } = req.body;

    if (!bookingId || !baseAmount || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: "bookingId, baseAmount, paymentMode required",
      });
    }

    if (!["online", "cash"].includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment mode",
      });
    }

    const exists = await Payment.findOne({ bookingId });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Payment already exists for this booking",
      });
    }

    const approvedExtras = await ExtraWork.find({
      bookingId,
      approvedByCustomer: true,
    });

    const extraAmount = approvedExtras.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const totalAmount = baseAmount + extraAmount;

    const commissionAmount = totalAmount * 0.1;
    const technicianAmount = totalAmount - commissionAmount;

    const payment = await Payment.create({
      bookingId,
      baseAmount,
      extraAmount,
      totalAmount,
      commissionAmount,
      technicianAmount,
      paymentMode,
    });

    res.status(201).json({
      success: true,
      message: "Payment created",
      result: payment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Payment Status
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "success", "failed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const payment = await Payment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      message: "Payment status updated",
      result: payment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
