import mongoose from "mongoose";
import JobBroadcast from "../schemas/TechnicianBroadcast.js";
import ServiceBooking from "../schemas/ServiceBooking.js";
import Technician from "../schemas/Technician.js";

/* ================= GET MY JOBS ================= */
export const getMyJobs = async (req, res) => {
  try {
    if (req.user.role !== "Technician") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        result: null,
      });
    }

    const technician = await Technician.findOne({
      userId: req.user.userId,
    });

    const jobs = await JobBroadcast.find({})
      .populate({
        path: "bookingId",
        populate: { path: "serviceId", select: "serviceName" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Jobs fetched successfully",
      result: jobs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
      result: null,
    });
  }
};

/* ================= RESPOND TO JOB ================= */
export const respondToJob = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid status",
        result: null,
      });
    }

    const technician = await Technician.findOne({
      userId: req.user.userId,
    }).session(session);

    const job = await JobBroadcast.findById(id).session(session);

    if (!job || job.status !== "sent") {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "Job already processed",
        result: null,
      });
    }
    // if (job.technicianId.toString() !== technician._id.toString()) {
      
    //   await session.abortTransaction();
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied",
    //     result: null,
    //   });
    // }
    

    // ❌ Reject
    if (status === "rejected") {
      job.status = "rejected";
      await job.save({ session });
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: "Job rejected successfully",
        result: null,
      });
    }

    // ✅ Accept
    const booking = await ServiceBooking.findOneAndUpdate(
      { _id: job.bookingId, status: "broadcasted" },
      { technicianId: technician._id, status: "accepted" },
      { new: true, session }
    );

    if (!booking) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "Booking already taken",
        result: null,
      });
    }

    job.status = "accepted";
    await job.save({ session });

    await JobBroadcast.updateMany(
      { bookingId: booking._id, _id: { $ne: job._id } },
      { status: "expired" },
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Job accepted successfully",
      result: booking,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(500).json({
      success: false,
      message: err.message,
      result: null,
    });
  } finally {
    session.endSession();
  }
};

