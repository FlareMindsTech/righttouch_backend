import  Report  from "../Schemas/Report.js";


// ********user report**************

export const userReport = async (req , res)=>{
  try {
    const { technicianId , customerId , serviceId , complaint , image } = req.body;

    if( !technicianId , !customerId , !serviceId , !complaint , !image ){
      return res.status(404).json({
        message : "All field required"
      })
    }

    const reportData = await Report.create({
      technicianId , 
      customerId , 
      serviceId , 
      complaint , 
      image
    }) 
    await reportData.save();

    res.status(200).json({
      message : "report is send successfully..."
    })
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}


// ********user report  end**************

// ✅ Get All Reports
export const getAllReports = async (req, res) => {
  try {
    const { search } = req.query; // ?search=painting

    let query = {};

    if (search) {
      query = {
        $or: [
          { complaint: { $regex: search, $options: "i" } }, // text inside complaint
          { status: { $regex: search, $options: "i" } },    // report status if you have one
        ],
      };
    }

    const reports = await Report.find(query)
      .populate("serviceId", "serviceName")
      .populate("customerId", "email")
      .populate("technicianId", "userId");

    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// ✅ Get Report by ID
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id)
      .populate("serviceId", "serviceName")
      .populate("customerId", "email")
      .populate("technicianId", "userId");

    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
