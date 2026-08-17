import { Router } from "express";
import { requireUuid } from "../middleware/requireUuid.js";
import { removeExercise, addSet, updateSet, updateSets, removeSet } from "../controllers/sessionController.js";

const withId = requireUuid("id");

const exerciseRouter = Router();
exerciseRouter.delete("/:id", withId, removeExercise);
exerciseRouter.post("/:id/sets", withId, addSet);
exerciseRouter.put("/:id/sets", withId, updateSets);

const setRouter = Router();
setRouter.put("/:id", withId, updateSet);
setRouter.delete("/:id", withId, removeSet);

export { exerciseRouter as sessionExerciseRoutes, setRouter as sessionSetRoutes };
