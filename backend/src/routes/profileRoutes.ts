import { Router } from "express";
import { get, update } from "../controllers/profileController.js";

const router = Router();

router.get("/", get);
router.put("/", update);

export { router as profileRoutes };
