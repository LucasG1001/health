import { Router } from "express";
import { requireUuid } from "../middleware/requireUuid.js";
import {
  getAll,
  getById,
  create,
  update,
  reorder,
  replaceExercises,
  updateExercisePlan,
  remove,
} from "../controllers/splitController.js";
import { setExerciseCheck } from "../controllers/checkController.js";

const router = Router();
const withId = requireUuid("id");

router.get("/", getAll);
router.post("/", create);
router.post("/reorder", reorder);
router.get("/:id", withId, getById);
router.put("/:id", withId, update);
router.put("/:id/exercises", withId, replaceExercises);
router.put("/:id/exercises/:splitExerciseId", requireUuid("id", "splitExerciseId"), updateExercisePlan);
router.put(
  "/:id/exercises/:splitExerciseId/check",
  requireUuid("id", "splitExerciseId"),
  setExerciseCheck
);
router.delete("/:id", withId, remove);

export { router as splitRoutes };
