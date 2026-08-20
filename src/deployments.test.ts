import { describe, expect, it } from "vitest";
import {
  collectDeploymentUUIDs,
  formatCoolifyResponse,
  formatDeploymentResult,
} from "./deployments";

describe("collectDeploymentUUIDs", () => {
  it("collects deployment UUIDs and keeps non-pollable deployment results", () => {
    expect(
      collectDeploymentUUIDs([
        {
          resource_uuid: "app_1",
          deployment_uuid: "deployment_1",
          message: "Deployment request queued.",
        },
        {
          resource_uuid: "app_2",
          message: "Deployment already queued.",
        },
      ]),
    ).toEqual({
      deploymentUUIDs: ["deployment_1"],
      deploymentsWithoutUUID: [
        {
          resource_uuid: "app_2",
          message: "Deployment already queued.",
        },
      ],
    });
  });

  it("treats blank deployment UUIDs as missing", () => {
    expect(
      collectDeploymentUUIDs([
        {
          resource_uuid: "app_1",
          deployment_uuid: " ",
        },
      ]),
    ).toEqual({
      deploymentUUIDs: [],
      deploymentsWithoutUUID: [
        {
          resource_uuid: "app_1",
          deployment_uuid: " ",
        },
      ],
    });
  });
});

describe("formatDeploymentResult", () => {
  it("formats the Coolify message and resource UUID", () => {
    expect(
      formatDeploymentResult({
        resource_uuid: "app_1",
        message: "Deployment already queued.",
      }),
    ).toBe("resource_uuid=app_1, message=Deployment already queued.");
  });
});

describe("formatCoolifyResponse", () => {
  it("formats the raw Coolify response as JSON", () => {
    expect(
      formatCoolifyResponse({
        deployments: [
          {
            resource_uuid: "app_1",
            message: "Deployment already queued.",
          },
        ],
      }),
    ).toContain('"resource_uuid": "app_1"');
  });
});
