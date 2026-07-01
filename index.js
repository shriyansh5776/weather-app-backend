import { configDotenv } from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import authRouter from "./routes/auth-routes/auth.route.js";
import userRouter from "./routes/user-routes/user.route.js";
import weatherRouter from "./routes/weather-routes/weather.routes.js";
import favouriteRouter from "./routes/favourite-routes/favourite.route.js";
import recentSearchRouter from "./routes/recentSearches-routes/recentSearches.routes.js";
import adminRouter from "./routes/userRoles-routes/userRoutes.route.js";

configDotenv();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

async function startServer() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Database connected successfully");
  } catch (error) {
    console.error(error.message);
  }
}

startServer();

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Welcome to the interface",
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/weather", weatherRouter);
app.use("/api/v1/favorites", favouriteRouter);
app.use("/api/v1/recent-searches", recentSearchRouter);
app.use("/api/v1/admin", adminRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
