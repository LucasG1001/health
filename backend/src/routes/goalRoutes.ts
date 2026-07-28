import { Router } from "express";
import { requireUuid } from "../middleware/requireUuid.js";
import { getAll, getActive, create, update, remove } from "../controllers/goalController.js";

const router = Router();
const withId = requireUuid("id");

router.get("/", getAll);
router.get("/active", getActive);
router.post("/", create);
router.put("/:id", withId, update);
router.delete("/:id", withId, remove);

export { router as goalRoutes };
