import mongoose from "mongoose";
import JobBroadcast from "../Schemas/TechnicianBroadcast.js";
import ServiceBooking from "../Schemas/ServiceBooking.js";
import Technician from "../Schemas/Technician.js";

/* ================= GET MY JOBS ================= */
export const getMyJobs = async (req, res) => {
  try {
    if (req.user?.role !== "Technician") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        result: {},
      });
    }

    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        result: {},
      });
    }

    const technician = await Technician.findOne({ userId: req.user.userId });

    if (!technician) {
      return res.status(404).json({
        success: false,
        message: "Technician not found",
        result: {},
      });
    }

    const jobs = await JobBroadcast.find({
      technicianId: technician._id,
      status: "sent",
    })
      .populate({
        path: "bookingId",
        match: { status: "broadcasted" },
        populate: {
          path: "serviceId",
          select: "serviceName",
        },
      })
      .sort({ createdAt: -1 });

    const filteredJobs = jobs.filter((job) => job.bookingId);

    return res.status(200).json({
      success: true,
      message: "Jobs fetched successfully",
      result: filteredJobs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
      result: {},
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

    if (req.user?.role !== "Technician") {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Access denied",
        result: {},
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid broadcast ID",
        result: {},
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid status",
        result: {},
      });
    }

    const technician = await Technician.findOne({
      userId: req.user.userId,
    }).session(session);

    if (!technician) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Technician not found",
        result: {},
      });
    }

    const job = await JobBroadcast.findById(id).session(session);

    if (!job || job.status !== "sent") {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "Job already processed",
        result: {},
      });
    }

    if (job.technicianId.toString() !== technician._id.toString()) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Access denied",
        result: {},
      });
    }

    if (status === "rejected") {
      job.status = "rejected";
      await job.save({ session });
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: "Job rejected successfully",
        result: {},
      });
    }

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
        result: {},
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
      result: {},
    });
  } finally {
    session.endSession();
  }
};

