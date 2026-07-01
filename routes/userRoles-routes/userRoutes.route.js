import { Router } from "express";
import refreshAuth from "../../api/auth/user-auth/user.auth.js";
import checkAdmin from "../../middleware/checkAdmin.js";

import { getUsers,patchUser,deleteUser,invalidateCache,getMetrics } from "../../controllers/user-roles-controller/userRoles.controller.js";

const adminRouter = Router();

// All admin routes require authentication and admin role
adminRouter.use(refreshAuth);
adminRouter.use(checkAdmin);

// GET /api/v1/admin/users
adminRouter.get("/users", getUsers);

// PATCH /api/v1/admin/users/:id
adminRouter.patch("/users/:id", patchUser);

// DELETE /api/v1/admin/users/:id
adminRouter.delete("/users/:id", deleteUser);

// POST /api/v1/admin/cache/invalidate
adminRouter.post("/cache/invalidate", invalidateCache);

// GET /api/v1/admin/metrics
adminRouter.get("/metrics", getMetrics);

export default adminRouter;
