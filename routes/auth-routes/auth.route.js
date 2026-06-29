import { Router } from "express";
import { forgotPassword, loginUser, logoutUser, refreshToken, registerUser, resendEmail, resetPassword, verifyEmail } from "../../controllers/auth-controller/auth.controller.js";
import refreshAuth from "../../api/auth/user-auth/user.auth.js";

const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/logout",refreshAuth,logoutUser)
authRouter.post("/refresh",refreshToken)
authRouter.post("/forgot-password",forgotPassword)
authRouter.post("/reset-password",resetPassword)
authRouter.post("/verify-email/resend",resendEmail)
authRouter.post("/verify-email",refreshAuth,verifyEmail)


export default authRouter;
