import { configDotenv } from 'dotenv';
import express, { json } from 'express'
import mongoose from 'mongoose';
const app = express();
const PORT = process.env.PORT ||5000

app.use(json())
configDotenv()

async function startServer() {
    try {
        const connectDB = mongoose.connect(process.env.DB_URL)
        console.log("Database connected successfully");
    } catch (error) {
        console.log(error.message);
    }
}
startServer()
app.listen(PORT,()=>{
    console.log(`Server running at http://localhost:${PORT}`);
})
app.get("/",(req,res)=>{
    return res.status(200).json({
        success : true ,
        message : "Welcome to the interface"
    })
})
