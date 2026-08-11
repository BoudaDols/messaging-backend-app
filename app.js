require('dotenv').config();


const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000

app.get("/", (req, res)=>{
   res.send("You are on the server!!!");
})

app.listen(PORT, ()=> {
   console.log("The server is up now on the link: http://localhost:3000");
})