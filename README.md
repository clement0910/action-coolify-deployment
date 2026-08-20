# Action: `action-coolify-deployment`

This GitHub Action triggers one or more deployments to Coolify v4 based on `tag` and `uuid`. It waits until the deployment(s) returned by `deployments[]` reach the `finished` status.

If Coolify accepts the deploy request but does not return `deployment_uuid`, the action fails and prints the Coolify response.

## Inputs

- `webhook` (optional): Full Coolify deploy URL, for example `https://coolify.example.com/api/v1/deploy?uuid=app_uuid&force=false`. The action infers `coolify-url`, `uuid`, `tag`, and `force` from it.
- `coolify-webhook` (optional): Alias for `webhook`.
- `coolify-url` (optional): The Coolify base URL or API URL. Inferred from `webhook` when provided. Default is `https://app.coolify.io`.
- `api-key` (optional): The Coolify API key. Can also be provided with `coolify-token` or the `COOLIFY_TOKEN` environment variable.
- `coolify-token` (optional): Alias for `api-key`.
- `wait` (optional): Seconds to wait for the deployment to finish. Default is `600`.
- `tag` (optional): Tag name(s). Comma-separated list is also accepted.
- `uuid` (optional): Resource UUID(s). Comma-separated list is also accepted.
- `force` (optional): Force rebuild (without cache). Default is `false`.

The action also reads `COOLIFY_WEBHOOK_STAGING` or `COOLIFY_WEBHOOK` from the environment when no webhook input is provided.

## Outputs

This action does not produce any outputs.

## Example Usage

```yaml
name: Deploy to Coolify

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Deploy to Coolify
        uses: ./
        with:
          webhook: ${{ secrets.COOLIFY_WEBHOOK_STAGING }}
          coolify-token: ${{ secrets.COOLIFY_TOKEN }}
          wait: 600
```

You can also pass the two Coolify secrets as environment variables:

```yaml
      - name: Deploy to Coolify
        uses: ./
        env:
          COOLIFY_TOKEN: ${{ secrets.COOLIFY_TOKEN }}
          COOLIFY_WEBHOOK_STAGING: ${{ secrets.COOLIFY_WEBHOOK_STAGING }}
```
