import { GoogleGenAI, Type } from "@google/genai";

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

// Cheap vision model that finds the tree after a placed Christmas design (PLACE_CHECK, see app.ts).
export const PLACE_CHECK_MODEL = process.env.PLACE_CHECK_MODEL || DOOR_CHECK_MODEL;

const LOCATE_QUESTION =
  "This is a photo of a room with one decorated Christmas tree in it. Find the point where the tree stands on the floor: the " +
  "centre of its trunk, stand or tree skirt at floor level (not the middle of the tree, not its tip, not the gifts). Answer as " +
  'JSON: {"found": true, "x": <0-1000>, "y": <0-1000>}, where x is the distance of that point from the left edge and y its ' +
  "distance from the top edge, both scaled so that 1000 is the full image width or height. If there is no Christmas tree, or " +
  'you cannot tell where its base is, answer {"found": false}.';

const thousandth = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1000 ? v / 1000 : null;

/**
 * Reads the locator's answer. Accepts {found, x, y} (what we ask for) and Gemini's own conventions, in case the
 * model falls back to them: "point": [y, x] and "box_2d": [ymin, xmin, ymax, xmax], all on a 0-1000 scale, bare or
 * as the first item of a list, with or without a ```json fence. null = no tree or not sure. Throws on anything else.
 */
export function parseTreeBase(text: string): { x: number; y: number } | null {
  const body = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`place check gave no JSON (${body.slice(0, 40) || "empty"})`);
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return null;
    parsed = parsed[0];
  }
  if (parsed === null) return null;
  if (typeof parsed !== "object") throw new Error("place check gave no JSON object");
  const o = parsed as Record<string, unknown>;
  if (o.found === false) return null;
  let x = thousandth(o.x);
  let y = thousandth(o.y);
  if ((x === null || y === null) && Array.isArray(o.point) && o.point.length === 2) {
    y = thousandth(o.point[0]);
    x = thousandth(o.point[1]);
  }
  if ((x === null || y === null) && Array.isArray(o.box_2d) && o.box_2d.length === 4) {
    const [, xmin, ymax, xmax] = o.box_2d.map(thousandth);
    // The base of a tree is the middle of the bottom edge of its box.
    x = xmin !== null && xmax !== null && xmax >= xmin ? (xmin + xmax) / 2 : null;
    y = ymax;
  }
  if (x === null || y === null) throw new Error("place check gave no usable coordinates");
  return { x, y };
}

/**
 * Where the Christmas tree in a generated design stands, as fractions of the image (0,0 = top left), or null when
 * the model sees no tree or is not sure. API errors, timeouts and unreadable answers throw; the caller treats
 * that as "not checked".
 */
export async function locateTree(designJpegBase64: string): Promise<{ x: number; y: number } | null> {
  const response = await ai.models.generateContent({
    model: PLACE_CHECK_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType: "image/jpeg", data: designJpegBase64 } }, { text: LOCATE_QUESTION }],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { found: { type: Type.BOOLEAN }, x: { type: Type.INTEGER }, y: { type: Type.INTEGER } },
        required: ["found"],
      },
      httpOptions: { timeout: 25_000 },
    },
  });
  return parseTreeBase(response.text ?? "");
}
