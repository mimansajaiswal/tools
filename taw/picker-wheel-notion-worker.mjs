/** Deploy as a Cloudflare Worker. See picker-wheel-README.md for settings. */
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowed = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const headers = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "null",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "Authorization, Content-Type, Notion-Version, X-Proxy-Token",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Content-Type": "application/json",
    };
    const fail = (message, status) =>
      new Response(JSON.stringify({ message }), { status, headers });
    if (!origin || !allowed.includes(origin))
      return fail("Origin is not allowed by this Worker.", 403);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (
      env.PROXY_TOKEN &&
      request.headers.get("X-Proxy-Token") !== env.PROXY_TOKEN
    )
      return fail("Invalid proxy token.", 403);
    if (!/^Bearer \S+$/.test(request.headers.get("Authorization") || ""))
      return fail("Notion token required.", 401);
    let target;
    try {
      target = new URL(new URL(request.url).searchParams.get("url"));
    } catch {
      return fail("Invalid Notion URL.", 400);
    }
    if (
      target.origin !== "https://api.notion.com" ||
      target.username ||
      target.password ||
      target.search ||
      target.hash
    )
      return fail("Only Notion API URLs are allowed.", 400);
    const id = "[a-fA-F0-9-]{32,36}";
    const routes = {
      GET: new RegExp(`^/v1/(users/me|data_sources/${id}|pages/${id})$`),
      POST: new RegExp(`^/v1/(search|data_sources/${id}/query)$`),
      PATCH: new RegExp(`^/v1/pages/${id}$`),
    };
    if (!routes[request.method]?.test(target.pathname))
      return fail("This method or endpoint is not supported.", 405);
    let body;
    if (request.method !== "GET") {
      try {
        body = await request.json();
      } catch {
        return fail("Expected a JSON body.", 400);
      }
      if (
        request.method === "PATCH" &&
        (!body.properties ||
          Object.keys(body).some((key) => key !== "properties"))
      )
        return fail("Only page property updates are supported.", 400);
    }
    try {
      const upstream = await fetch(target.href, {
        method: request.method,
        headers: {
          Authorization: request.headers.get("Authorization"),
          "Content-Type": "application/json",
          "Notion-Version": "2025-09-03",
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: "error",
      });
      if (upstream.headers.has("Retry-After")) {
        headers["Retry-After"] = upstream.headers.get("Retry-After");
        headers["Access-Control-Expose-Headers"] = "Retry-After";
      }
      return new Response(upstream.body, { status: upstream.status, headers });
    } catch {
      return fail("Notion could not be reached.", 502);
    }
  },
};
