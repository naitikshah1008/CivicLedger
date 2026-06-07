import { PaymentDataSource } from "../data/paymentData";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export async function fetchBackendDatasets(): Promise<PaymentDataSource[]> {
  const response = await fetch(`${API_BASE}/datasets`);

  if (!response.ok) {
    throw new Error("Backend dataset API is unavailable.");
  }

  return response.json() as Promise<PaymentDataSource[]>;
}

export async function uploadPaymentFileToBackend(
  file: File,
): Promise<PaymentDataSource> {
  const response = await fetch(
    `${API_BASE}/datasets/import?filename=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: file,
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(payload?.error ?? "Backend import failed.");
  }

  return response.json() as Promise<PaymentDataSource>;
}
