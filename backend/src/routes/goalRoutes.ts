import { Router } from "express";
import { getAll, getActive, create, update, remove } from "../controllers/goalController.js";

const router = Router();

router.get("/", getAll);
router.get("/active", getActive);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export { router as goalRoutes };
