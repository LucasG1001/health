import { Router } from "express";
import { requireUuid } from "../middleware/requireUuid.js";
import { getAll, getLatest, create, update, remove } from "../controllers/measurementController.js";

const router = Router();
const withId = requireUuid("id");

router.get("/", getAll);
router.get("/latest", getLatest);
router.post("/", create);
router.put("/:id", withId, update);
router.delete("/:id", withId, remove);

export { router as measurementRoutes };
