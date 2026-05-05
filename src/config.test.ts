import { describe, expect, it } from "vitest";
import { normalizeApiBaseUrl, parseCoolifyWebhookUrl } from "./config";

describe("normalizeApiBaseUrl", () => {
  it("builds the v1 API base URL from a Coolify root URL", () => {
    expect(normalizeApiBaseUrl("https://coolify.lecommis.fr")).toBe(
      "https://coolify.lecommis.fr/api/v1",
    );
  });

  it("strips deploy path and query string from a full deploy URL", () => {
    expect(
      normalizeApiBaseUrl(
        "https://coolify.lecommis.fr/api/v1/deploy?uuid=app_uuid&force=false",
      ),
    ).toBe("https://coolify.lecommis.fr/api/v1");
  });
});

describe("parseCoolifyWebhookUrl", () => {
  it("reads uuid and force from the Coolify v4 deploy URL", () => {
    expect(
      parseCoolifyWebhookUrl(
        "https://coolify.lecommis.fr/api/v1/deploy?uuid=app_uuid&force=false",
      ),
    ).toEqual({
      baseUrl: "https://coolify.lecommis.fr/api/v1",
      uuid: "app_uuid",
      force: false,
    });
  });

  it("reads tag deployments from the Coolify v4 deploy URL", () => {
    expect(
      parseCoolifyWebhookUrl(
        "https://coolify.lecommis.fr/api/v1/deploy?tag=staging&force=true",
      ),
    ).toEqual({
      baseUrl: "https://coolify.lecommis.fr/api/v1",
      tag: "staging",
      force: true,
    });
  });

  it("rejects invalid webhook URLs", () => {
    expect(() => parseCoolifyWebhookUrl("not-a-url")).toThrow(
      "Invalid Coolify webhook URL",
    );
  });

  it("rejects URLs that do not point to the deploy endpoint", () => {
    expect(() =>
      parseCoolifyWebhookUrl("https://coolify.lecommis.fr/api/v1/applications"),
    ).toThrow("Coolify webhook URL must point to /api/v1/deploy.");
  });
});
