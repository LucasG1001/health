import { Router } from "express";
import { search, sync } from "../controllers/catalogController.js";

const router = Router();

router.get("/exercises", search);
router.post("/sync", sync);

export { router as catalogRoutes };
