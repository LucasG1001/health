import { Router } from "express";
import { body } from "../controllers/statsController.js";

const router = Router();

router.get("/body", body);

export { router as statsRoutes };
