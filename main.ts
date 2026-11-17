const productionOrigin = "https://gangnam1st.com";
const homePath = "/full1";
const publicRoot = new URL("./public/", import.meta.url);
const routes: Record<string, string> = JSON.parse(await Deno.readTextFile(new URL("routes.json", publicRoot)));
const homeAliases = new Set(["/", "/full1/", "/fullsalong", "/fullsalong/", "/index.html"]);
const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "SAMEORIGIN",
};
const mimeTypes: Record<string, string> = {
  html: "text/html; charset=utf-8", css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8", webp: "image/webp",
  svg: "image/svg+xml", xml: "application/xml; charset=utf-8", txt: "text/plain; charset=utf-8",
};
type FileEntry = { bytes: Uint8Array<ArrayBuffer>; type: string; etag: string };
const files = new Map<string, FileEntry>();
async function loadFile(file: string) {
  const bytes = await Deno.readFile(new URL(file, publicRoot));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const ext = file.split(".").pop() ?? "";
  files.set(file, { bytes, type: mimeTypes[ext] ?? "application/octet-stream", etag: `"${hash}"` });
}
for (const file of [...Object.values(routes), "404.html", "sitemap.xml", "robots.txt"]) await loadFile(file);
for await (const entry of Deno.readDir(new URL("assets/", publicRoot))) {
  if (entry.isFile && /^[a-zA-Z0-9._-]+$/.test(entry.name)) await loadFile("assets/" + entry.name);
}

export function handle(request: Request): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { ...securityHeaders, allow: "GET, HEAD", "cache-control": "no-store" } });
  }
  const url = new URL(request.url);
  const isProduction = url.hostname === "gangnam1st.com";
  const stripped = url.pathname.replace(/\/+$/, "");
  const canonicalPath = homeAliases.has(url.pathname) ? homePath : routes[stripped] ? stripped : url.pathname;
  if (url.hostname === "www.gangnam1st.com" || canonicalPath !== url.pathname) {
    const target = new URL(url.hostname === "www.gangnam1st.com" ? productionOrigin : url.origin);
    target.pathname = canonicalPath;
    target.search = url.search;
    return new Response(null, { status: 301, headers: { ...securityHeaders, location: target.href, "cache-control": "public, max-age=300" } });
  }
  if (url.pathname === "/robots.txt" && !isProduction) {
    return new Response(request.method === "HEAD" ? null : "User-agent: *\nDisallow: /\n", { headers: { ...securityHeaders, "content-type": mimeTypes.txt, "cache-control": "no-cache", "x-robots-tag": "noindex, nofollow" } });
  }
  let file = routes[url.pathname];
  if (url.pathname === "/sitemap.xml" || url.pathname === "/robots.txt") file = url.pathname.slice(1);
  if (/^\/assets\/[a-zA-Z0-9._-]+$/.test(url.pathname)) file = url.pathname.slice(1);
  let entry = file ? files.get(file) : undefined;
  const status = entry ? 200 : 404;
  if (!entry) entry = files.get("404.html")!;
  const headers = new Headers({ ...securityHeaders, "content-type": entry.type, etag: entry.etag });
  const cache = status === 404 ? "no-store" : file?.endsWith(".webp") ? "public, max-age=31536000, immutable" : "public, max-age=60, s-maxage=60, must-revalidate";
  headers.set("cache-control", cache);
  if (!isProduction || status === 404) headers.set("x-robots-tag", "noindex, follow");
  if (status === 200 && request.headers.get("if-none-match")?.split(",").map(v => v.trim()).includes(entry.etag)) {
    return new Response(null, { status: 304, headers });
  }
  headers.set("content-length", String(entry.bytes.byteLength));
  return new Response(request.method === "HEAD" ? null : entry.bytes, { status, headers });
}

if (import.meta.main) Deno.serve(handle);
