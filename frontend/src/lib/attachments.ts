/**
 * Files and long pastes attached to a chat turn.
 *
 * Two kinds, because they leave the browser by different routes:
 *
 *  text  — read here and inlined into the message as a fenced block. Works
 *          with every model, including ones that have never heard of
 *          attachments, because by the time it is sent it is just prose.
 *  image — carried as a base64 data URL in an OpenAI `image_url` content
 *          block. Only models with the `vision` capability can take it, which
 *          is why the composer refuses to send one to a model that cannot.
 */

export type AttachmentKind = "text" | "image";

export interface Attachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  /** Bytes, for the chip label. */
  size: number;
  mime: string;
  /** Set for `text`. */
  text?: string;
  /** Set for `image` — a `data:` URL. */
  dataUrl?: string;
}

/** Anything longer than this, pasted in one go, becomes a file instead. */
export const PASTE_THRESHOLD = 2000;

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "rst", "csv", "tsv", "json", "jsonl", "yaml", "yml",
  "xml", "html", "htm", "css", "scss", "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "py", "go", "rs", "java", "kt", "rb", "php", "c", "h", "cpp", "hpp", "cs",
  "swift", "sh", "bash", "zsh", "sql", "toml", "ini", "cfg", "env", "log", "diff", "patch",
]);

const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

/** Generous for prose, small enough that a stray log file is caught. */
export const MAX_TEXT_BYTES = 512 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class AttachmentError extends Error {}

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function isTextFile(file: File): boolean {
  return file.type.startsWith("text/") || TEXT_EXTENSIONS.has(extensionOf(file.name));
}

export function isImageFile(file: File): boolean {
  return IMAGE_MIMES.has(file.type);
}

let counter = 0;
const nextId = () => `att-${Date.now().toString(36)}-${counter++}`;

/**
 * Turn a dropped file into something sendable, or explain why it isn't.
 *
 * PDFs and Office documents are refused rather than silently attached as
 * bytes nothing downstream can read: OptiAI has no extractor for them, and an
 * attachment that arrives as gibberish is worse than one that never attached.
 */
export async function fileToAttachment(file: File): Promise<Attachment> {
  if (isImageFile(file)) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new AttachmentError(
        `${file.name} is ${formatBytes(file.size)} — images are capped at ${formatBytes(MAX_IMAGE_BYTES)}.`
      );
    }
    return {
      id: nextId(),
      name: file.name,
      kind: "image",
      size: file.size,
      mime: file.type,
      dataUrl: await readAsDataUrl(file),
    };
  }

  if (isTextFile(file)) {
    if (file.size > MAX_TEXT_BYTES) {
      throw new AttachmentError(
        `${file.name} is ${formatBytes(file.size)} — text files are capped at ${formatBytes(MAX_TEXT_BYTES)}.`
      );
    }
    return {
      id: nextId(),
      name: file.name,
      kind: "text",
      size: file.size,
      mime: file.type || "text/plain",
      text: await file.text(),
    };
  }

  const ext = extensionOf(file.name);
  throw new AttachmentError(
    ext === "pdf" || ext === "docx" || ext === "doc"
      ? `OptiAI cannot read ${ext.toUpperCase()} files yet — export it as text or Markdown and drop that instead.`
      : `${file.name} is not a file type OptiAI can read. Text, code and images work.`
  );
}

/** A long paste, kept out of the composer so the box stays usable. */
export function pastedTextAttachment(text: string, index: number): Attachment {
  return {
    id: nextId(),
    name: index === 0 ? "pasted-context.txt" : `pasted-context-${index + 1}.txt`,
    kind: "text",
    size: new Blob([text]).size,
    mime: "text/plain",
    text,
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new AttachmentError(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** One OpenAI content block. */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/**
 * The message body actually sent upstream.
 *
 * With no images this stays a plain string, because that is what every
 * provider and the router's own usage accounting expect; switching to the
 * array form only when an image is present keeps the common path untouched.
 * Text attachments are fenced with their filename so the model can tell the
 * document apart from what the user typed.
 */
export function buildContent(text: string, attachments: Attachment[]): string | ContentPart[] {
  const texts = attachments.filter((a) => a.kind === "text");
  const images = attachments.filter((a) => a.kind === "image");

  const inlined = texts
    .map((a) => `\n\n\`\`\`file ${a.name}\n${a.text ?? ""}\n\`\`\``)
    .join("");
  const body = `${text}${inlined}`;

  if (images.length === 0) return body;

  return [
    { type: "text", text: body },
    ...images.map((a) => ({
      type: "image_url" as const,
      image_url: { url: a.dataUrl! },
    })),
  ];
}

/** What the transcript shows for this turn — images become a short note. */
export function buildTranscriptText(text: string, attachments: Attachment[]): string {
  if (attachments.length === 0) return text;
  const names = attachments.map((a) => a.name).join(", ");
  return text ? `${text}\n\n📎 ${names}` : `📎 ${names}`;
}
