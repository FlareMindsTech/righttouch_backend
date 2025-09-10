import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
      category: {
        type: String,
        // enum: [
        //   "Painting",
        //   "Cleaning"
        // ],
        required: true,
      },
      description : {
        type : String,
        required : true
      },
      image : {
        type : String,
        required : true
      },
      createdAt: {
        type: Date,
        default: Date.now,
    },
})

export default mongoose.model("category" ,categorySchema);
