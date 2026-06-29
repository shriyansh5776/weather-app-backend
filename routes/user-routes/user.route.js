import { Router } from "express";
import refreshAuth from "../../api/auth/user-auth/user.auth.js";
import { changePassword, getMe, getPref, setGetMe } from "../../controllers/user-controller/user.controller.js";


const userRouter = Router()

userRouter.get("/me",refreshAuth,getMe)
userRouter.patch("/me",refreshAuth,setGetMe)
userRouter.post("/me/change-password",refreshAuth,changePassword)
userRouter.get("/me/preferences",refreshAuth,getPref)

export default userRouter