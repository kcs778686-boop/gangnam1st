import { handle } from "./main.ts";
const routes = JSON.parse(await Deno.readTextFile(new URL("./public/routes.json", import.meta.url)));
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const req = (path: string, init?: RequestInit) => new Request("https://gangnam1st.com" + path, init);

Deno.test("All fourteen public routes serve indexable HTML and matching canonicals", async () => {
  assert(Object.keys(routes).length === 14, "Expected fourteen pages");
  for (const path of Object.keys(routes)) {
    const response = handle(req(path));
    assert(response.status === 200, `${path}: ${response.status}`);
    assert(!response.headers.has("x-robots-tag"), `${path}: production noindex`);
    const body = await response.text();
    assert(body.includes(`rel="canonical" href="https://gangnam1st.com${path}"`), `${path}: canonical`);
    assert((body.match(/<h1[ >]/g) || []).length === 1, `${path}: H1 count`);
  }
});
Deno.test("Legacy URLs preserve permanent redirects and query strings", () => {
  for (const path of ["/", "/full1/", "/fullsalong", "/fullsalong/"]) {
    const response = handle(req(path + "?source=test"));
    assert(response.status === 301, path);
    assert(response.headers.get("location") === "https://gangnam1st.com/full1?source=test", path);
  }
  assert(handle(req("/blog/first-visit/")).headers.get("location") === "https://gangnam1st.com/blog/first-visit", "article slash");
  assert(handle(new Request("https://www.gangnam1st.com/pickup")).headers.get("location") === "https://gangnam1st.com/pickup", "www");
});
Deno.test("Images, CSS, HEAD, and conditional requests behave correctly", async () => {
  const response=handle(req("/assets/luxury-sedan-640.webp"));
  assert(response.status===200 && response.headers.get("content-type")==="image/webp", "image MIME");
  assert((await response.arrayBuffer()).byteLength>1000, "image bytes");
  const head=handle(req("/pickup", {method:"HEAD"}));
  assert(head.status===200 && await head.text()==="", "HEAD must have no body");
  assert(Number(head.headers.get("content-length"))>0, "HEAD length");
  const cached=handle(req("/pickup", {headers:{"if-none-match":head.headers.get("etag")!}}));
  assert(cached.status===304 && await cached.text()==="", "conditional response");
  assert(handle(req("/assets/site.css?v=test")).headers.get("content-type")?.startsWith("text/css"), "CSS query");
});
Deno.test("Unknown files are real 404s and origin previews are excluded from indexing", async () => {
  for (const path of ["/does-not-exist", "/public/routes.json", "/main.ts", "/assets/missing.webp"]) {
    const response=handle(req(path));
    assert(response.status===404, path);
    assert(response.headers.get("cache-control")==="no-store", path+" cache");
  }
  const origin=handle(new Request("https://example.deno.net/full1"));
  assert(origin.headers.get("x-robots-tag")?.includes("noindex"), "origin noindex");
  const robots=handle(new Request("https://example.deno.net/robots.txt"));
  assert((await robots.text()).includes("Disallow: /"), "origin robots");
  assert(handle(req("/full1",{method:"POST"})).status===405,"POST");
});
Deno.test("Sitemap includes every page and no preview domain", async () => {
  const sitemap=await handle(req("/sitemap.xml")).text();
  for (const path of Object.keys(routes)) assert(sitemap.includes(`<loc>https://gangnam1st.com${path}</loc>`), path);
  assert(!sitemap.includes("deno.net"), "origin in sitemap");
});
