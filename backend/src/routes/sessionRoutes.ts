import { Router } from "express";
import { requireUuid } from "../middleware/requireUuid.js";
import {
  list,
  getActive,
  getById,
  start,
  update,
  finish,
  remove,
  addExercise,
} from "../controllers/sessionController.js";

const router = Router();
const withId = requireUuid("id");

router.get("/", list);
router.get("/active", getActive);
router.post("/", start);
router.get("/:id", withId, getById);
router.patch("/:id", withId, update);
router.post("/:id/finish", withId, finish);
router.delete("/:id", withId, remove);
router.post("/:id/exercises", withId, addExercise);

export { router as sessionRoutes };
