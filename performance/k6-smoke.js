import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: Number(__ENV.K6_VUS || 1),
      duration: __ENV.K6_DURATION || "30s",
      gracefulStop: "5s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
  },
};

function requireBaseUrl() {
  const baseUrl = __ENV.K6_BASE_URL || __ENV.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    throw new Error(
      "Missing K6_BASE_URL or NEXT_PUBLIC_APP_URL. Point this smoke script at a dedicated test environment."
    );
  }

  return baseUrl.replace(/\/+$/, "");
}

function uniqueEmail() {
  const iteration = exec.scenario.iterationInInstance;
  const nonce = `${Date.now()}-${iteration}`.replace(/[^0-9-]/g, "");
  return `k6-smoke-${nonce}@example.com`;
}

export default function () {
  const baseUrl = requireBaseUrl();

  const loginRes = http.get(`${baseUrl}/login`, {
    tags: { name: "login-page" },
  });

  check(loginRes, {
    "login page returns 200": (res) => res.status === 200,
    "login page contains FacilityPro": (res) =>
      String(res.body || "").includes("FacilityPro"),
  });

  const ipRes = http.get(`${baseUrl}/api/auth/client-ip`, {
    tags: { name: "client-ip" },
  });

  check(ipRes, {
    "client-ip returns 200": (res) => res.status === 200,
    "client-ip returns an ip field": (res) => {
      try {
        const payload = res.json();
        return Boolean(payload?.ip);
      } catch {
        return false;
      }
    },
  });

  const waitlistRes = http.post(
    `${baseUrl}/api/waitlist`,
    JSON.stringify({
      email: uniqueEmail(),
      name: "K6 Smoke",
      company: "FacilityPro",
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
      tags: { name: "waitlist" },
    }
  );

  check(waitlistRes, {
    "waitlist request succeeds": (res) => res.status === 200,
  });

  sleep(1);
}
