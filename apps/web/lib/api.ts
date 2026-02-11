const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export async function encryptAndSave(partyId: string, payload: object) {
  const response = await fetch(`${API_URL}/tx/encrypt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ partyId, payload }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to encrypt");
  }

  return response.json();
}

export async function fetchTransaction(id: string) {
  const response = await fetch(`${API_URL}/tx/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch transaction");
  }

  return response.json();
}

export async function decryptTransaction(id: string) {
  const response = await fetch(`${API_URL}/tx/${id}/decrypt`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to decrypt");
  }

  return response.json();
}
