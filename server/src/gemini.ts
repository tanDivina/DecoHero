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

// Cheap vision model that names the furniture under the cyan X markers before a removal (REMOVE_NAMES, see app.ts).
export const REMOVE_NAMES_MODEL = process.env.REMOVE_NAMES_MODEL || DOOR_CHECK_MODEL;

/** One cyan X: the piece under it, how many pieces of that kind the photo shows, and unmarked pieces touching it. */
export type MarkedPiece = { piece: string; sameKind?: number; neighbours: string[] };

const NAMES_QUESTION =
  "This photo of a room has one or two bright cyan circles with a cyan X inside drawn on top of it. Each marks ONE piece of " +
  "furniture that will be taken out of the room. For each cyan X give: \"piece\": the single piece of furniture directly under " +
  "the centre of the X, in a few words with its colour and where it stands (for example \"the white desk on the right\" or " +
  "\"the dining chair at the right-hand end of the table\"); \"sameKind\": how many pieces of that same kind the whole photo " +
  "shows, the marked one included (6 for one of six dining chairs, 2 for one of two sofas, 1 for the only desk); " +
  "\"neighbours\": up to three OTHER pieces of furniture that touch it, stand right next to it or are partly hidden behind it, " +
  "each in a few words with colour and position (for example \"the white chair at the desk\"). Never list as a neighbour a " +
  "piece that has a cyan X of its own, and list nothing that is not furniture. " +
  'Answer as JSON: {"marks": [{"piece": "...", "sameKind": 1, "neighbours": ["..."]}]}.';

/** Model text that goes into a prompt: letters, digits, spaces and plain punctuation only, one line, capped. */
const plainWords = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[^\p{L}\p{N} ,'()-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Reads the namer's answer. Throws unless it holds 1 to `max` marks with a named piece each. */
export function parseMarkedPieces(text: string, max = 2): MarkedPiece[] {
  const body = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`remove names gave no JSON (${body.slice(0, 40) || "empty"})`);
  }
  const marks = (parsed as { marks?: unknown } | null)?.marks;
  if (!Array.isArray(marks) || marks.length < 1 || marks.length > max) throw new Error("remove names gave no usable list of marks");
  return marks.map((m) => {
    const o = (typeof m === "object" && m !== null ? m : {}) as Record<string, unknown>;
    const piece = plainWords(o.piece, 80);
    if (!piece) throw new Error("remove names gave a mark without a piece");
    const n = o.sameKind;
    const sameKind = typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 12 ? n : undefined;
    const neighbours = (Array.isArray(o.neighbours) ? o.neighbours : []).map((x) => plainWords(x, 80)).filter(Boolean).slice(0, 3);
    return { piece, sameKind, neighbours };
  });
}

/**
 * Names the furniture under the cyan X markers of the photo that goes to the image model (`count` markers) and the
 * unmarked pieces touching them, so the prompt can say in words what goes and what stays. API errors, timeouts and
 * unreadable answers throw; the caller then sends the prompt without names.
 */
export async function nameMarkedPieces(sentJpegBase64: string, count: number): Promise<MarkedPiece[]> {
  const response = await ai.models.generateContent({
    model: REMOVE_NAMES_MODEL,
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: sentJpegBase64 } }, { text: NAMES_QUESTION }] }],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          marks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { piece: { type: Type.STRING }, sameKind: { type: Type.INTEGER }, neighbours: { type: Type.ARRAY, items: { type: Type.STRING } } },
              required: ["piece", "neighbours"],
            },
          },
        },
        required: ["marks"],
      },
      httpOptions: { timeout: 15_000 },
    },
  });
  const marks = parseMarkedPieces(response.text ?? "");
  if (marks.length !== count) throw new Error(`remove names found ${marks.length} marks, expected ${count}`);
  return marks;
}
