import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
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
        required : true,
        default : 1
    },
    active : {
        type : String,
        enum : ["active" , "inactive"],
        required : true
    },
    status:{
        type : String,
        enum : ["waiting","accepted" , "decline"],
        required : true,
        default : "waiting"
    },
    duration : {
        type : String
    },


    createdAt: {
    type: Date,
    default: Date.now,
},
});

export default mongoose.model("Service" ,serviceSchema);