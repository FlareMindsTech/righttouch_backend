import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
    technicianId  :{
        type : mongoose.Schema.Types.ObjectId,
        ref : "Technician",
        // required : true
    },
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        // required : true
    },
    categoryId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Category",
        required : true
    },
    serviceName : {
        type : String ,
        // enum: [
        // "AC",
        // "Washing machine",
        // "Water purifier",
        // "Refrigerator",
        // "Microwave",
        // ],
        required : true,
    },
    description : {
        type : String,
        required : true
    },
    cost : {
        type : Number,
        required : true
    },
    quantity : {
        type : Number,
        required : true
    },
    active : {
        type : String,
        enum : ["active" , "inactive"],
        required : true
    },
    status:{
        type : String,
        enum : ["accepted" , "decline"],
        required : true
    },
    duration : {
        type : String
    },


    createdAt: {
    type: Date,
    default: Date.now,
},
});

export default mongoose.model("service" ,serviceSchema);