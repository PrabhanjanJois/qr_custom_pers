// trial-get-carded.js
// Usage: node trial-get-carded.js
// Make sure: npm install axios

const axios = require("axios");

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSm9pcyBQcmFiaGFuamFuIiwiZW1haWwiOiJqb2lzLnByYWJoYW5qYW5AZ21haWwuY29tIiwiZGF0ZSI6IjIwMjUtMTEtMTYgMDU6NDQ6NDgifQ.NFWRfDkWOZSvABKcDqxa-ncfuEL6IbEMP3VhHCY6tmM";

const url = "https://workwithus.lucioai.com/get-carded?stamped=true";

const headerVariants = [
  { Authorization: `Bearer ${token}` },
  { Authorization: token },
  { "x-access-token": token },
  { Cookie: `token=${token}` },
  { "X-Entry-Token": token },
  { "X-Auth-Token": token },
  { "x-auth-token": token },
];

const bodyKeys = [
  { stamped: true },
  { has_stamp: true },
  { hasStamp: true },
  { entry_stamp: true },
  { entryStamp: true },
  { stamp: true },
  { stamped: "true" },
  { stamp: "entry" },
];

const methods = ["GET", "POST"];

async function tryRequest(method, headers = {}, body = undefined) {
  try {
    const config = {
      method,
      url,
      headers: {
        ...headers,
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; TrialScript/1.0)",
      },
      validateStatus: () => true, // don't throw for 4xx/5xx
      timeout: 10000,
    };
    if (method === "POST") {
      config.headers["Content-Type"] = "application/json";
      config.data = body ?? {};
    } else if (method === "GET" && body) {
      // some servers accept a query param instead of body
      config.params = body;
    }

    const res = await axios(config);
    return { status: res.status, headers: res.headers, data: res.data };
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

(async () => {
  console.log("Starting automated trial of /get-carded variants...\n");

  // 1) Try simple GET header variants (most likely)
  for (const h of headerVariants) {
    const attempt = { method: "GET", headers: h };
    console.log("Trying:", JSON.stringify(attempt));
    const r = await tryRequest("GET", h);
    console.log(
      "=>",
      r.status || r.error,
      r.data ? JSON.stringify(r.data) : ""
    );
    if (r.status && r.status !== 403) {
      console.log(
        "\nSUCCESS:",
        JSON.stringify({ attempt, result: r }, null, 2)
      );
      return;
    }
    console.log("---");
  }

  // 2) Try POST with many body keys + header variants
  for (const method of methods) {
    for (const h of headerVariants) {
      for (const body of bodyKeys) {
        console.log(`Trying: method=${method}, header=${Object.keys(h)[0]}}`);
        const r = await tryRequest(method, h, body);
        console.log(
          "=>",
          r.status || r.error,
          r.data ? JSON.stringify(r.data) : ""
        );
        if (r.status && r.status !== 403) {
          console.log(
            "\nSUCCESS:",
            JSON.stringify({ method, header: h, body, result: r }, null, 2)
          );
          return;
        }
        console.log("---");
      }
    }
  }

  // 3) Try cookie-only + body-only combos (no auth header)
  console.log("Trying cookie-only and body-only combos...");
  for (const body of bodyKeys) {
    const r = await tryRequest("POST", { Cookie: `token=${token}` });
    console.log(
      "=>",
      r.status || r.error,
      r.data ? JSON.stringify(r.data) : ""
    );
    if (r.status && r.status !== 403) {
      console.log(
        "\nSUCCESS:",
        JSON.stringify(
          { method: "POST", cookie: true, body, result: r },
          null,
          2
        )
      );
      return;
    }
  }

  console.log("\nAll attempts finished — none returned a non-403 response.");
  console.log(
    "If you still get 403, please copy the full verbose `curl -v` output (request + response headers and body) and paste it here.\n"
  );
  console.log("Alternative next steps:");
  console.log(
    "- Try running curl -v -X GET/POST with these header/body combos and paste the verbose result here."
  );
  console.log(
    "- Sometimes servers require an extra header like 'X-Stamp: true' or a specific User-Agent — the script already sets a basic User-Agent."
  );
})();
