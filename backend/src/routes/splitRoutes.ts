import { Router } from "express";
import {
  getAll,
  getById,
  create,
  update,
  reorder,
  replaceExercises,
  remove,
} from "../controllers/splitController.js";

const router = Router();

router.get("/", getAll);
router.post("/", create);
router.post("/reorder", reorder);
router.get("/:id", getById);
router.put("/:id", update);
router.put("/:id/exercises", replaceExercises);
router.delete("/:id", remove);

export { router as splitRoutes };
