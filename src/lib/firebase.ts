import { BusinessCard } from "./db";

// Dynamically resolve API URL based on frontend hostname (useful for native devices or local Docker setups)
export const getApiUrl = () => {
  if (typeof window === "undefined") return "http://localhost:5001";
  const host = window.location.hostname;
  return `http://${host}:5001`;
};

// Check if Remote server is reachable/enabled
export const isFirebaseEnabled = true; // Always enable API server database by default

// Get single business card by ID from SQLite REST API
export async function getCard(id: string): Promise<BusinessCard | null> {
  try {
    const response = await fetch(`${getApiUrl()}/api/cards/${id}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      throw new Error(errRes.error || `Server responded with status: ${response.status}`);
    }
    const cardData = await response.json();
    return cardData as BusinessCard;
  } catch (error) {
    console.error("Error calling getCard API:", error);
    throw error;
  }
}

// Save or overwrite card in SQLite REST API (validates password hashed comparison on backend)
export async function saveCard(card: BusinessCard): Promise<void> {
  try {
    const response = await fetch(`${getApiUrl()}/api/cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(card),
    });

    if (!response.ok) {
      const errRes = await response.json().catch(() => ({}));
      throw new Error(errRes.error || "명함 저장에 실패했습니다.");
    }
  } catch (error) {
    console.error("Error calling saveCard API:", error);
    throw error;
  }
}

