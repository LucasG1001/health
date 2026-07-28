import { Router } from "express";
import { createUploader } from "../lib/upload.js";
import { requireUuid } from "../middleware/requireUuid.js";
import {
  getAll,
  getById,
  create,
  update,
  remove,
  uploadImage,
  removeImage,
  getLastPerformance,
  getHistory,
} from "../controllers/exerciseController.js";

const router = Router();
const uploader = createUploader("exercises", { allowGif: true });
const withId = requireUuid("id");

router.get("/", getAll);
router.post("/", create);
router.get("/:id", withId, getById);
router.put("/:id", withId, update);
router.delete("/:id", withId, remove);
router.post("/:id/image", withId, uploader.single("file"), uploadImage);
router.delete("/:id/image", withId, removeImage);
router.get("/:id/last-performance", withId, getLastPerformance);
router.get("/:id/history", withId, getHistory);

export { router as exerciseRoutes };
