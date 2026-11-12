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
