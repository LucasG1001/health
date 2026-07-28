import { Router } from "express";
import { createUploader } from "../lib/upload.js";
import { requireUuid } from "../middleware/requireUuid.js";
import { getAll, create, remove } from "../controllers/photoController.js";

const router = Router();
const uploader = createUploader("photos");

router.get("/", getAll);
router.post("/", uploader.single("file"), create);
router.delete("/:id", requireUuid("id"), remove);

export { router as photoRoutes };
