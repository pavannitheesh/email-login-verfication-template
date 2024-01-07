 require("./config/mongodb");

const express=require('express');
const cors=require('cors');
require("dotenv").config();
const app = express();
app.use(cors());
const bodyparser=require('express').json;

app.use(bodyparser());
const port=process.env.PORT || 3001;

app.use("/user",require("./api/User"));

app.listen(port, function(){
console.log('listening on port http://localhost:'+port);


});

