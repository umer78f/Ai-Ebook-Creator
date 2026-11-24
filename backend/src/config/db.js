const mongoose = require("mongoose");


async function connectDb(){
    try{
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Database connected successfully")
    }catch(err){
        console.log("Error Connecting Database", err);
        process.exit(1);
    }
}

module.exports = connectDb