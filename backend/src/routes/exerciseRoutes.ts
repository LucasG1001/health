import { Router } from "express";
import { createUploader } from "../lib/upload.js";
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

router.get("/", getAll);
router.post("/", create);
router.get("/:id", getById);
router.put("/:id", update);
router.delete("/:id", remove);
router.post("/:id/image", uploader.single("file"), uploadImage);
router.delete("/:id/image", removeImage);
router.get("/:id/last-performance", getLastPerformance);
router.get("/:id/history", getHistory);

export { router as exerciseRoutes };
