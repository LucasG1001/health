import { Router } from "express";
import { list } from "../controllers/loadLogController.js";

const router = Router();

router.get("/", list);

export { router as loadLogRoutes };
