import { Router } from "express";
import { get, update } from "../controllers/settingsController.js";

const router = Router();

router.get("/", get);
router.put("/", update);

export { router as settingsRoutes };
