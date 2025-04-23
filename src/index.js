// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: "./env"
})


connectDB()

.then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server Listening at ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MongoDB Connection Failed", err);
})















// import express from "express"
// const app = express()
// (async() => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         app.on("errror", (error) => {
//             console.log("error:", error);
//             throw new error
//         })
//         app.listen(process.env.PORT, () => {
//             console.log(`App listening on ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.error("error");
//         throw new error
//     }
// })()