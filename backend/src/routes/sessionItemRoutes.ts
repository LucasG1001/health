import { Router } from "express";
import { removeExercise, addSet, updateSet, removeSet } from "../controllers/sessionController.js";

const exerciseRouter = Router();
exerciseRouter.delete("/:id", removeExercise);
exerciseRouter.post("/:id/sets", addSet);

const setRouter = Router();
setRouter.put("/:id", updateSet);
setRouter.delete("/:id", removeSet);

export { exerciseRouter as sessionExerciseRoutes, setRouter as sessionSetRoutes };
