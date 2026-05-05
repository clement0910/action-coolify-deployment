import { getInput } from "@actions/core";

const API_BASE_PATH = "/api/v1";
const DEFAULT_COOLIFY_URL = "https://app.coolify.io";

export type WebhookConfig = {
  baseUrl: string;
  tag?: string;
  uuid?: string;
  force?: boolean;
};

export type DeployConfig = {
  apiKey: string;
  baseUrl: string;
  waitTimeSeconds: number;
  tag?: string;
  uuid?: string;
  force: boolean;
};

export const toOptionalString = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();

  return trimmed === "" ? undefined : trimmed;
};

export const normalizeApiBaseUrl = (coolifyUrl: string): string => {
  const url = new URL(coolifyUrl);
  const apiBasePathIndex = url.pathname.indexOf(API_BASE_PATH);

  if (apiBasePathIndex >= 0) {
    url.pathname = url.pathname.slice(
      0,
      apiBasePathIndex + API_BASE_PATH.length,
    );
  } else {
    url.pathname = API_BASE_PATH;
  }

  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
};

export const parseBooleanInput = (value: string, name: string): boolean => {
  switch (value.trim().toLowerCase()) {
    case "true":
    case "1":
    case "yes":
    case "y":
      return true;
    case "false":
    case "0":
    case "no":
    case "n":
      return false;
    default:
      throw new Error(`${name} must be a boolean value.`);
  }
};

export const parseCoolifyWebhookUrl = (webhookUrl: string): WebhookConfig => {
  let url: URL;

  try {
    url = new URL(webhookUrl);
  } catch (error) {
    throw new Error(
      `Invalid Coolify webhook URL: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!url.pathname.replace(/\/+$/, "").endsWith(`${API_BASE_PATH}/deploy`)) {
    throw new Error("Coolify webhook URL must point to /api/v1/deploy.");
  }

  const config: WebhookConfig = {
    baseUrl: normalizeApiBaseUrl(url.toString()),
  };

  const tag = toOptionalString(url.searchParams.get("tag"));
  if (tag) {
    config.tag = tag;
  }

  const uuid = toOptionalString(url.searchParams.get("uuid"));
  if (uuid) {
    config.uuid = uuid;
  }

  const force = toOptionalString(url.searchParams.get("force"));
  if (force !== undefined) {
    config.force = parseBooleanInput(force, "force");
  }

  return config;
};

const optionalInput = (name: string): string | undefined =>
  toOptionalString(getInput(name, { required: false }));

const optionalEnv = (name: string): string | undefined =>
  toOptionalString(process.env[name]);

const parseWaitTimeSeconds = (value?: string): number => {
  const waitTimeSeconds = Number.parseInt(value ?? "600", 10);

  if (!Number.isFinite(waitTimeSeconds) || waitTimeSeconds <= 0) {
    throw new Error("wait must be a positive number of seconds.");
  }

  return waitTimeSeconds;
};

export const readConfig = (): DeployConfig => {
  const webhookUrl =
    optionalInput("webhook") ??
    optionalInput("coolify-webhook") ??
    optionalEnv("COOLIFY_WEBHOOK_STAGING") ??
    optionalEnv("COOLIFY_WEBHOOK");
  const webhookConfig = webhookUrl
    ? parseCoolifyWebhookUrl(webhookUrl)
    : undefined;

  const apiKey =
    optionalInput("api-key") ??
    optionalInput("coolify-token") ??
    optionalEnv("COOLIFY_TOKEN");

  if (!apiKey) {
    throw new Error(
      "Coolify token must be provided through api-key, coolify-token, or COOLIFY_TOKEN.",
    );
  }

  const baseUrl = normalizeApiBaseUrl(
    optionalInput("coolify-url") ??
      webhookConfig?.baseUrl ??
      DEFAULT_COOLIFY_URL,
  );
  const tag = optionalInput("tag") ?? webhookConfig?.tag;
  const uuid = optionalInput("uuid") ?? webhookConfig?.uuid;
  const forceInput = optionalInput("force");
  const force =
    forceInput !== undefined
      ? parseBooleanInput(forceInput, "force")
      : (webhookConfig?.force ?? false);

  if (!tag && !uuid) {
    throw new Error(
      "Either tag or uuid must be provided as an input or in the Coolify webhook URL.",
    );
  }

  return {
    apiKey,
    baseUrl,
    waitTimeSeconds: parseWaitTimeSeconds(optionalInput("wait")),
    tag,
    uuid,
    force,
  };
};
