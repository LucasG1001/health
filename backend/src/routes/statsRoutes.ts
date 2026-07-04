import { Router } from "express";
import { body, volume } from "../controllers/statsController.js";

const router = Router();

router.get("/body", body);
router.get("/volume", volume);

export { router as statsRoutes };
