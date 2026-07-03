import { Router } from "express";
import { getAll, getLatest, create, update, remove } from "../controllers/measurementController.js";

const router = Router();

router.get("/", getAll);
router.get("/latest", getLatest);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export { router as measurementRoutes };
