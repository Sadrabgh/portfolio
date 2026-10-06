import assert from "node:assert/strict";
import http from "node:http";
import { gunzipSync } from "node:zlib";
import { server, origin } from "./v10-common.mjs";
const request = (encoding, method = "GET") =>
  new Promise((resolve, reject) => {
    const req = http.request(
      origin + "/demo/avan/",
      { method, headers: { "Accept-Encoding": encoding } },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            headers: res.headers,
            body: Buffer.concat(chunks),
            status: res.statusCode,
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
try {
  const plain = await request("identity"),
    gzip = await request("gzip"),
    disabled = await request("gzip;q=0"),
    head = await request("gzip", "HEAD");
  assert.equal(gzip.status, 200);
  assert.equal(gzip.headers["content-encoding"], "gzip");
  assert(gzip.body.length < plain.body.length);
  assert.deepEqual(gunzipSync(gzip.body), plain.body);
  assert.equal(gzip.headers.vary, "Accept-Encoding");
  assert.equal(Number(gzip.headers["content-length"]), gzip.body.length);
  assert.equal(disabled.headers["content-encoding"], undefined);
  assert.deepEqual(disabled.body, plain.body);
  assert.equal(head.body.length, 0);
  assert.equal(head.headers["content-encoding"], "gzip");
  console.log("Preview gzip, negotiation, content length and HEAD passed");
} finally {
  server.close();
}
