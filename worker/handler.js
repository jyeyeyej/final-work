const MAX_FILE_SIZE = 20 * 1024 * 1024;
const FILE_PREFIX = "team-documents/";
const ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "md", "txt", "csv", "zip",
  "png", "jpg", "jpeg", "webp", "gif"
]);

const CONTENT_TYPES = {
  "/index.html": "text/html; charset=utf-8",
  "/style.css": "text/css; charset=utf-8",
  "/app.js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function clean(value, max) {
  return String(value || "").trim().slice(0, max);
}

function encodeMeta(value) {
  return encodeURIComponent(value);
}

function decodeMeta(value) {
  try { return decodeURIComponent(value || ""); } catch { return value || ""; }
}

function safeFileName(name) {
  const cleaned = clean(name, 180).replace(/[\\/\r\n\0]/g, "-").replace(/\s+/g, " ");
  return cleaned || "document";
}

function extension(name) {
  return name.toLowerCase().split(".").pop() || "";
}

function codeMatches(submitted, expected) {
  if (!submitted || !expected) return false;
  const a = new TextEncoder().encode(submitted);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function requireTeamCode(request, env) {
  return codeMatches(request.headers.get("x-team-code"), env.TEAM_UPLOAD_CODE);
}

async function listDocuments(env) {
  if (!env.BUCKET) return json({ error: "문서 저장소가 아직 준비되지 않았습니다." }, 503);
  const result = await env.BUCKET.list({ prefix: FILE_PREFIX, limit: 500, include: ["customMetadata", "httpMetadata"] });
  const documents = result.objects.map((object) => {
    const meta = object.customMetadata || {};
    return {
      key: object.key,
      title: decodeMeta(meta.title) || decodeMeta(meta.fileName),
      category: decodeMeta(meta.category) || "기타",
      description: decodeMeta(meta.description),
      uploader: decodeMeta(meta.uploader) || "팀원",
      fileName: decodeMeta(meta.fileName) || object.key.split("/").pop(),
      contentType: decodeMeta(meta.contentType) || object.httpMetadata?.contentType || "application/octet-stream",
      uploadedAt: meta.uploadedAt || object.uploaded?.toISOString?.() || "",
      size: object.size,
      url: `/api/library/file/${encodeURIComponent(object.key)}`
    };
  }).sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
  return json({ documents });
}

async function uploadDocument(request, env) {
  if (!requireTeamCode(request, env)) return json({ error: "팀 업로드 코드가 올바르지 않습니다." }, 401);
  if (!env.BUCKET) return json({ error: "문서 저장소가 아직 준비되지 않았습니다." }, 503);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_FILE_SIZE + 1024 * 1024) return json({ error: "파일은 20MB까지 올릴 수 있습니다." }, 413);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "업로드할 파일을 선택해 주세요." }, 400);
  if (file.size > MAX_FILE_SIZE) return json({ error: "파일은 20MB까지 올릴 수 있습니다." }, 413);
  const fileName = safeFileName(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension(fileName))) return json({ error: "지원하지 않는 파일 형식입니다." }, 415);

  const title = clean(form.get("title"), 100) || fileName.replace(/\.[^.]+$/, "");
  const category = clean(form.get("category"), 100) || "기타";
  const description = clean(form.get("description"), 500);
  const uploader = clean(form.get("uploader"), 50) || "팀원";
  const uploadedAt = new Date().toISOString();
  const key = `${FILE_PREFIX}${Date.now()}-${crypto.randomUUID()}-${fileName}`;
  const contentType = clean(file.type, 120) || "application/octet-stream";

  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType },
    customMetadata: {
      title: encodeMeta(title),
      category: encodeMeta(category),
      description: encodeMeta(description),
      uploader: encodeMeta(uploader),
      fileName: encodeMeta(fileName),
      contentType: encodeMeta(contentType),
      uploadedAt
    }
  });
  return json({ ok: true, key }, 201);
}

async function getDocument(pathname, env) {
  if (!env.BUCKET) return new Response("Storage unavailable", { status: 503 });
  let key;
  try { key = decodeURIComponent(pathname.slice("/api/library/file/".length)); } catch { return new Response("Bad request", { status: 400 }); }
  if (!key.startsWith(FILE_PREFIX)) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const meta = object.customMetadata || {};
  const fileName = safeFileName(decodeMeta(meta.fileName) || key.split("/").pop());
  const contentType = decodeMeta(meta.contentType) || object.httpMetadata?.contentType || "application/octet-stream";
  const inline = contentType === "application/pdf" || contentType.startsWith("image/") || contentType.startsWith("text/");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", contentType);
  headers.set("content-disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}

function serveStatic(pathname) {
  const path = pathname === "/" ? "/index.html" : pathname;
  const body = STATIC_ASSETS[path];
  if (body == null) return null;
  let type = CONTENT_TYPES[path];
  if (!type && path.endsWith(".md")) type = CONTENT_TYPES[".md"];
  return new Response(body, { headers: { "content-type": type || "text/plain; charset=utf-8", "cache-control": path === "/index.html" ? "no-cache" : "public, max-age=300" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let pathname = url.pathname;
    try { pathname = decodeURIComponent(pathname); } catch {}

    try {
      if (request.method === "GET" && pathname === "/api/library") return await listDocuments(env);
      if (request.method === "POST" && pathname === "/api/library/upload") return await uploadDocument(request, env);
      if (request.method === "GET" && pathname.startsWith("/api/library/file/")) return await getDocument(url.pathname, env);
      if (request.method === "GET") {
        const response = serveStatic(pathname);
        if (response) return response;
      }
      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("Request failed", error);
      return pathname.startsWith("/api/") ? json({ error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500) : new Response("Server error", { status: 500 });
    }
  }
};
