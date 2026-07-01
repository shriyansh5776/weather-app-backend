import { Router } from "express";
import refreshAuth from "../../api/auth/user-auth/user.auth.js";
import {
  getRecentSearches,postRecentSearch,deleteRecentSearch,clearRecentSearches
} from "../../controllers/recentSearches-auth-controller/recentSearches.controller.js";

const recentSearchRouter = Router();

recentSearchRouter.use(refreshAuth);

recentSearchRouter.get("/", getRecentSearches);

recentSearchRouter.post("/", postRecentSearch);

recentSearchRouter.delete("/:id", deleteRecentSearch);

recentSearchRouter.delete("/", clearRecentSearches);

export default recentSearchRouter;
