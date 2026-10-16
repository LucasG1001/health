import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("../models/exerciseModel.js", () => ({
  replaceImagePath: vi.fn(),
  clearImagePath: vi.fn(),
}));
vi.mock("../lib/upload.js", () => ({
  relativeUploadPath: (subdir: string, filename: string) => `${subdir}/${filename}`,
  removeUploadedFile: vi.fn(),
}));

const exerciseModel = await import("../models/exerciseModel.js");
const upload = await import("../lib/upload.js");
const { uploadImage, removeImage } = await import("./exerciseController.js");

function call(handler: typeof uploadImage, req: Partial<Request>) {
  const res = {
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return handler(req as Request, res as unknown as Response).then(() => res);
}

const req = { params: { id: "x" }, file: { filename: "nova.jpg" } } as unknown as Partial<Request>;

describe("uploadImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("apaga o arquivo enviado quando o banco falha", async () => {
    vi.mocked(exerciseModel.replaceImagePath).mockRejectedValue(new Error("db fora"));
    const res = await call(uploadImage, req);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(upload.removeUploadedFile).toHaveBeenCalledWith("exercises/nova.jpg");
  });

  it("responde 404 e apaga o arquivo quando o exercício não existe", async () => {
    vi.mocked(exerciseModel.replaceImagePath).mockResolvedValue(null);
    const res = await call(uploadImage, req);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(upload.removeUploadedFile).toHaveBeenCalledWith("exercises/nova.jpg");
  });

  it("troca a imagem e apaga só a anterior", async () => {
    const exercise = { id: "x" };
    vi.mocked(exerciseModel.replaceImagePath).mockResolvedValue({
      exercise: exercise as never,
      oldPath: "exercises/velha.jpg",
    });
    const res = await call(uploadImage, req);
    expect(res.json).toHaveBeenCalledWith(exercise);
    expect(upload.removeUploadedFile).toHaveBeenCalledTimes(1);
    expect(upload.removeUploadedFile).toHaveBeenCalledWith("exercises/velha.jpg");
  });
});

describe("removeImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 404 quando o exercício não existe", async () => {
    vi.mocked(exerciseModel.clearImagePath).mockResolvedValue(null);
    const res = await call(removeImage, { params: { id: "x" } } as unknown as Partial<Request>);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
