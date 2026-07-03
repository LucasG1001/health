import { Router } from "express";
import { createUploader } from "../lib/upload.js";
import { getAll, create, remove } from "../controllers/photoController.js";

const router = Router();
const uploader = createUploader("photos");

router.get("/", getAll);
router.post("/", uploader.single("file"), create);
router.delete("/:id", remove);

export { router as photoRoutes };
