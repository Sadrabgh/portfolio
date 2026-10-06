// Optional standalone Cloudflare Worker. It is not part of the static build.
// Configure bindings and secrets before deployment; see README.fa.md.
export function validate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const limits = {
    name: 100,
    contact: 160,
    service: 2,
    message: 4000,
    company: 100,
    budget: 100,
    timeline: 100,
  };
  const data = {};
  for (const [key, max] of Object.entries(limits)) {
    if (input[key] !== undefined && typeof input[key] !== "string") return null;
    const value = (input[key] || "").trim();
    if (value.length > max) return null;
    data[key] = value;
  }
  const contact = data.contact
    .replace(/[۰-۹]/g, (x) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(x)))
    .replace(/[٠-٩]/g, (x) => String("٠١٢٣٤٥٦٧٨٩".indexOf(x)));
  if (
    data.name.length < 2 ||
    data.message.length < 20 ||
    !["01", "02", "03", "04"].includes(data.service)
  )
    return null;
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) &&
    !/^\+?[\d\s()-]{8,20}$/.test(contact)
  )
    return null;
  if (typeof input.website === "string" && input.website.trim()) return null;
  return data;
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };
    const response = (status, body) =>
      new Response(JSON.stringify(body), { status, headers });
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN)
      return response(403, { success: false, error: "origin" });
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST")
      return response(405, { success: false, error: "method" });
    if (
      !env.RATE_LIMITER ||
      !env.RESEND_API_KEY ||
      !env.CONTACT_RECIPIENT ||
      !env.CONTACT_FROM
    )
      return response(503, { success: false, error: "unconfigured" });
    const ip = request.headers.get("CF-Connecting-IP");
    if (!ip) return response(403, { success: false, error: "client" });
    const limit = await env.RATE_LIMITER.limit({ key: ip });
    if (!limit.success)
      return response(429, { success: false, error: "rate_limit" });
    if (!request.headers.get("Content-Type")?.startsWith("application/json"))
      return response(415, { success: false, error: "content_type" });
    if (Number(request.headers.get("Content-Length")) > 16000)
      return response(413, { success: false, error: "size" });
    // Bound streaming input before parsing; Content-Length is not trusted.
    const reader = request.body?.getReader();
    if (!reader) return response(400, { success: false, error: "body" });
    let bytes = 0;
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16000) {
        await reader.cancel();
        return response(413, { success: false, error: "size" });
      }
      chunks.push(value);
    }
    const raw = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      raw.set(chunk, offset);
      offset += chunk.length;
    }
    let data;
    try {
      data = validate(JSON.parse(new TextDecoder().decode(raw)));
    } catch {
      return response(400, { success: false, error: "json" });
    }
    if (!data) return response(422, { success: false, error: "validation" });
    const text = `نام: ${data.name}\nراه ارتباط: ${data.contact}\nنوع پروژه: ${data.service}\nکسب‌وکار: ${data.company}\nبودجه: ${data.budget}\nزمان: ${data.timeline}\n\n${data.message}`;
    try {
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.CONTACT_FROM,
          to: [env.CONTACT_RECIPIENT],
          subject: "درخواست جدید طراحی سایت",
          text,
          ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact)
            ? { reply_to: data.contact }
            : {}),
        }),
        signal: AbortSignal.timeout(10000),
      });
      const payload = await result.json();
      if (!result.ok || typeof payload.id !== "string")
        return response(502, { success: false, error: "delivery" });
      return response(200, { success: true });
    } catch {
      return response(502, { success: false, error: "delivery" });
    }
  },
};
