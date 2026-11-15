import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

// The key is read from the environment only. Never log it, return it or write it to disk.
const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 120_000 } });
export const IMAGE_MODEL = process.env.IMAGE_MODEL || "gemini-3.1-flash-image";

/** One-line, key-free description of an error, safe for logs. */
export function describeError(err: unknown): string {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return msg.split(apiKey!).join("[redacted]").replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").slice(0, 300);
}

export async function generateRedesign(imageJpegBase64: string, prompt: string): Promise<Buffer> {
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageJpegBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: { responseModalities: ["TEXT", "IMAGE"] },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const reason = response.candidates?.[0]?.finishReason ?? "NO_IMAGE";
    throw new Error(`Gemini returned no image (${reason})`);
  }
  return Buffer.from(imagePart.inlineData.data, "base64");
}

// Cheap text model for the yes/no door check after Christmas designs (DOOR_CHECK, see app.ts).
export const DOOR_CHECK_MODEL = process.env.DOOR_CHECK_MODEL || "gemini-3.5-flash-lite";

/**
 * Shows the model the user's photo and the generated design and asks one yes/no question.
 * true = "yes", false = "no". Anything else (other text, no text, API error, timeout) throws,
 * and the caller treats that as "not checked".
 */
export async function askYesNo(firstJpegBase64: string, secondJpegBase64: string, question: string): Promise<boolean> {
  const response = await ai.models.generateContent({
    model: DOOR_CHECK_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: firstJpegBase64 } },
          { inlineData: { mimeType: "image/jpeg", data: secondJpegBase64 } },
          { text: question },
        ],
      },
    ],
    config: { temperature: 0, httpOptions: { timeout: 25_000 } },
  });
  const answer = (response.text ?? "").trim().toLowerCase();
  if (/^yes\b/.test(answer)) return true;
  if (/^no\b/.test(answer)) return false;
  throw new Error(`door check gave no yes/no answer (${answer.slice(0, 40) || "empty"})`);
}
