import { Router } from "express";
import { forgotPassword, loginUser, logoutUser, refreshToken, registerUser, resetPassword } from "../../controllers/user-controller/user.controller.js";
import refreshAuth from "../../api/auth/user-auth/user.auth.js";

const userRouter = Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/logout",refreshAuth,logoutUser)
userRouter.post("/refresh",refreshToken)
userRouter.post("/forgot-password",forgotPassword)
userRouter.post("/reset-password",resetPassword)


export default userRouter;
