import { debug, info, setFailed } from "@actions/core";
import createClient from "openapi-fetch";
import { type DeployConfig, readConfig } from "./config";
import { collectDeploymentUUIDs, formatCoolifyResponse } from "./deployments";
import type { paths } from "./schema";

type CoolifyClient = ReturnType<typeof createClient<paths>>;
type DeployResponse = NonNullable<
  paths["/deploy"]["post"]["responses"]["200"]["content"]["application/json"]
>;
type Deployment = NonNullable<DeployResponse["deployments"]>[number];
type DeploymentStatus = NonNullable<
  paths["/deployments/{uuid}"]["get"]["responses"]["200"]["content"]["application/json"]
>;

const terminalSuccessStatuses = new Set(["finished"]);
const terminalFailureStatuses = new Set([
  "failed",
  "cancelled",
  "cancelled-by-user",
  "cancelled-by-system",
]);

const fail = (message: string): never => {
  setFailed(message);
  process.exit(1);
};

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return JSON.stringify(error);
};

const createCoolifyClient = (config: DeployConfig) =>
  createClient<paths>({
    baseUrl: config.baseUrl,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
  });

const deploy = async (
  coolifyClient: CoolifyClient,
  config: DeployConfig,
): Promise<Deployment[]> => {
  if (config.tag) debug(`Deploying tag: ${config.tag}`);
  if (config.uuid) debug(`Deploying uuid: ${config.uuid}`);

  const result = await coolifyClient.POST("/deploy", {
    params: {
      query: {
        tag: config.tag,
        uuid: config.uuid,
        force: config.force,
      },
    },
  });

  const data = result.data;

  if (!data) {
    return fail(`Failed to deploy: ${getErrorMessage(result.error)}`);
  }

  debug(JSON.stringify(data));

  const deployments = data.deployments;

  if (!Array.isArray(deployments)) {
    return fail(
      `Coolify deploy response did not include deployments[]. Response:\n${formatCoolifyResponse(data)}`,
    );
  }

  return deployments;
};

const getDeploymentStatus = async (
  coolifyClient: CoolifyClient,
  uuid: string,
): Promise<DeploymentStatus> => {
  const result = await coolifyClient.GET("/deployments/{uuid}", {
    params: { path: { uuid } },
  });

  const data = result.data;

  if (!data) {
    return fail(
      `Failed to get deployment status for deployment '${uuid}': ${getErrorMessage(result.error)}`,
    );
  }

  return data;
};

void (async () => {
  try {
    const config = readConfig();
    const coolifyClient = createCoolifyClient(config);
    const deployments = await deploy(coolifyClient, config);
    const { deploymentUUIDs, deploymentsWithoutUUID } =
      collectDeploymentUUIDs(deployments);

    if (deployments.length === 0) {
      fail(
        `Coolify deploy response did not include any deployments. Response:\n${formatCoolifyResponse({ deployments })}`,
      );
    }

    if (deploymentsWithoutUUID.length > 0) {
      fail(
        `Coolify deploy response included deployment(s) without deployment_uuid. Response:\n${formatCoolifyResponse({ deployments })}`,
      );
    }

    info(`Triggered ${deploymentUUIDs.length} Coolify deployment(s).`);

    const status: Record<string, string> = Object.fromEntries(
      deploymentUUIDs.map((uuid) => [uuid, "queued"]),
    );
    const endTime = Date.now() + config.waitTimeSeconds * 1000;
    // Pause between updates
    const pause = 5000;

    while (
      Object.values(status).some(
        (currentStatus) => !terminalSuccessStatuses.has(currentStatus),
      )
    ) {
      if (Date.now() > endTime) {
        fail("Timeout reached");
      }

      for (const uuid of Object.keys(status).filter(
        (uuid) => !terminalSuccessStatuses.has(status[uuid]),
      )) {
        const nextStatus = await getDeploymentStatus(coolifyClient, uuid);
        const nextStatusValue = nextStatus.status ?? "queued";

        if (nextStatusValue !== status[uuid]) {
          info(
            `Deployment ${nextStatus.application_name ?? "unknown"} (${uuid}) status: ${nextStatusValue}`,
          );
          status[uuid] = nextStatusValue;
        }

        if (terminalFailureStatuses.has(status[uuid])) {
          fail(`Deployment ${uuid} failed with status: ${status[uuid]}`);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pause));
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
})();
