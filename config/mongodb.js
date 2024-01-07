const mongoose = require('mongoose');
require("dotenv").config();
mongoose.connect(process.env.MONGODB_URL
).then(()=>{
    console.log("Mongodb is succesfully coneected");

}).catch(err => console.log(err));    