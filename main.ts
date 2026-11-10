const productionOrigin = "https://gangnam1st.com";
const homePath = "/full1";
const page = await Deno.readTextFile(new URL("./public/index.html", import.meta.url));

const homeAliases = new Set(["/", "/full1/", "/fullsalong", "/fullsalong/"]);
const responseHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

function respond(request: Request, body: string, type: string, status = 200): Response {
  return new Response(request.method === "HEAD" ? null : body, {
    status,
    headers: {
      ...responseHeaders,
      "content-type": type + "; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=300" : "no-cache",
    },
  });
}

export function handle(request: Request): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const url = new URL(request.url);
  const isProduction = url.hostname === "gangnam1st.com";
  if (url.hostname === "www.gangnam1st.com" || homeAliases.has(url.pathname)) {
    const target = new URL(url.hostname === "www.gangnam1st.com" ? productionOrigin : url.origin);
    target.pathname = homeAliases.has(url.pathname) ? homePath : url.pathname;
    target.search = url.search;
    return new Response(null, { status: 301, headers: { ...responseHeaders, location: target.href } });
  }

  if (url.pathname === homePath) {
    const response = respond(request, page, "text/html");
    if (!isProduction) response.headers.set("x-robots-tag", "noindex, follow");
    return response;
  }

  if (url.pathname === "/robots.txt") {
    return respond(request, "User-agent: *\nAllow: /\nSitemap: " + productionOrigin + "/sitemap.xml\n", "text/plain");
  }

  if (url.pathname === "/sitemap.xml") {
    return respond(request, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + productionOrigin + homePath + '</loc></url></urlset>\n', "application/xml");
  }

  return respond(request, '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>페이지를 찾을 수 없습니다</title><h1>페이지를 찾을 수 없습니다</h1><p><a href="/full1">강남풀싸롱 이용 안내로 이동</a></p></html>', "text/html", 404);
}

if (import.meta.main) Deno.serve(handle);
