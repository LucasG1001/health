import { Router } from "express";
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

router.get("/", list);
router.get("/active", getActive);
router.post("/", start);
router.get("/:id", getById);
router.patch("/:id", update);
router.post("/:id/finish", finish);
router.delete("/:id", remove);
router.post("/:id/exercises", addExercise);

export { router as sessionRoutes };
