import { Router } from "express";
import refreshAuth from "../../api/auth/user-auth/user.auth.js";
import { deleteFavourite, getFavourites, patchFavourite, postFavourites } from "../../controllers/favourite-controller/favourite.controller.js";


const favouriteRouter = Router()

favouriteRouter.get("/",refreshAuth,getFavourites)
favouriteRouter.post("/",refreshAuth,postFavourites)
favouriteRouter.patch("/:id",refreshAuth, patchFavourite);
favouriteRouter.delete("/:id",refreshAuth, deleteFavourite);
export default favouriteRouter