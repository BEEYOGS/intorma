const base = (process.env.BASE_URL || "https://intorma-psi.vercel.app").replace(/\/$/, "");

const checks = [
  { name: "health", path: "/api/health", expect: 200 },
  { name: "robots", path: "/robots.txt", expect: 200 },
  { name: "sitemap", path: "/sitemap.xml", expect: 200 },
  { name: "home", path: "/", expect: 200 },
  { name: "upload legacy", path: "/api/upload?code=INT-TEST", method: "POST", expect: 410 },
  { name: "webhook GET", path: "/api/wa/webhook", expect: 403 },
  { name: "cron reminders", path: "/api/cron/reminders", expect: [401, 503] },
  { name: "invalid code", path: "/api/lacak/INVALID/status", expect: 400 },
  { name: "wa secret path", path: "/api/wa/webhook/invalidsecret", method: "POST", expect: 401 },
  { name: "wa outbox private", path: "/api/wa/outbox", expect: 401 },
  { name: "db migrate private", path: "/api/db/migrate", method: "POST", expect: 401 },
  { name: "upload token retired", path: "/api/upload/token", expect: 410 },
];

let failed = 0;
for (const check of checks) {
  try {
    const response = await fetch(base + check.path, {
      method: check.method || "GET",
      cache: "no-store",
    });
    const expected = Array.isArray(check.expect) ? check.expect : [check.expect];
    const ok = expected.includes(response.status);
    if (!ok) failed += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${check.name}: ${response.status} (expected ${Array.isArray(check.expect) ? check.expect.join("/") : check.expect})`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${check.name}: ${String(error).slice(0, 80)}`);
  }
}

if (failed > 0) {
  console.error(`Smoke test gagal: ${failed} check.`);
  process.exit(1);
}
console.log("Smoke test OK.");
