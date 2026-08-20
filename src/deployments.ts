import { toOptionalString } from "./config";

export type DeploymentResult = {
  message?: string;
  resource_uuid?: string;
  deployment_uuid?: string;
};

export type DeploymentUUIDCollection = {
  deploymentUUIDs: string[];
  deploymentsWithoutUUID: DeploymentResult[];
};

export const collectDeploymentUUIDs = (
  deployments: DeploymentResult[],
): DeploymentUUIDCollection => {
  const deploymentUUIDs: string[] = [];
  const deploymentsWithoutUUID: DeploymentResult[] = [];

  for (const deployment of deployments) {
    const deploymentUUID = toOptionalString(deployment.deployment_uuid);

    if (deploymentUUID) {
      deploymentUUIDs.push(deploymentUUID);
    } else {
      deploymentsWithoutUUID.push(deployment);
    }
  }

  return {
    deploymentUUIDs,
    deploymentsWithoutUUID,
  };
};

export const formatDeploymentResult = (
  deployment: DeploymentResult,
): string => {
  const details = [
    deployment.resource_uuid ? `resource_uuid=${deployment.resource_uuid}` : "",
    deployment.message ? `message=${deployment.message}` : "",
  ].filter(Boolean);

  return details.length > 0 ? details.join(", ") : JSON.stringify(deployment);
};

export const formatCoolifyResponse = (response: unknown): string =>
  JSON.stringify(response, null, 2);
