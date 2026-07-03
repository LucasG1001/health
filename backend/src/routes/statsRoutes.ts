import { Router } from "express";
import { body, volume, gamification } from "../controllers/statsController.js";

const router = Router();

router.get("/body", body);
router.get("/volume", volume);
router.get("/gamification", gamification);

export { router as statsRoutes };
