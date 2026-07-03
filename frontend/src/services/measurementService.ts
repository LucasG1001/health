import { api } from "./api";
import type { Measurement, MeasurementInput } from "../types/measurement";

export async function fetchMeasurements(range?: { from?: string; to?: string }): Promise<Measurement[]> {
  const response = await api.get<Measurement[]>("/api/measurements", { params: range });
  return response.data;
}

export async function fetchLatestMeasurement(): Promise<Measurement | null> {
  const response = await api.get<Measurement | null>("/api/measurements/latest");
  return response.data;
}

export async function createMeasurement(input: MeasurementInput): Promise<Measurement> {
  const response = await api.post<Measurement>("/api/measurements", input);
  return response.data;
}

export async function updateMeasurement(id: string, input: MeasurementInput): Promise<Measurement> {
  const response = await api.put<Measurement>(`/api/measurements/${id}`, input);
  return response.data;
}

export async function deleteMeasurement(id: string): Promise<void> {
  await api.delete(`/api/measurements/${id}`);
}
