# Azure Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Azure Static   │────▶│  Next.js API      │────▶│  Azure SQL Database │
│  Web Apps /     │     │  Routes           │     │                     │
│  App Service    │     │  (Server-side)    │     └─────────────────────┘
└─────────────────┘     └──────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │  Azure OpenAI    │
                        │  Service         │
                        └──────────────────┘
```

## Prerequisites

- Azure subscription
- Azure CLI installed (`az`)
- Node.js 18.17+
- npm or yarn

## Step 1: Create Azure Resources

### Resource Group

```bash
az group create \
  --name rg-problems4us \
  --location eastus2
```

### Azure SQL Database

```bash
# Create SQL Server
az sql server create \
  --name problems4us-sql \
  --resource-group rg-problems4us \
  --location eastus2 \
  --admin-user p4uadmin \
  --admin-password "<strong-password>"

# Create database
az sql db create \
  --resource-group rg-problems4us \
  --server problems4us-sql \
  --name problems4us \
  --service-objective S0

# Allow Azure services
az sql server firewall-rule create \
  --resource-group rg-problems4us \
  --server problems4us-sql \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Initialize Database

On the existing Azure SQL server (`prius.database.windows.net`):

```bash
# Create database (Azure CLI)
az sql db create \
  --resource-group Prius_RG \
  --server prius \
  --name Problems4UsDB \
  --edition Basic \
  --capacity 5 \
  --max-size 2GB

# Apply schema and seed (PowerShell — uses Azure AD or SQL login)
.\database\provision.ps1 -Server prius -ResourceGroup Prius_RG -User wewon2018 -Password "<password>"

# Or with sqlcmd directly
sqlcmd -S prius.database.windows.net \
  -U wewon2018 -P "<password>" \
  -d Problems4UsDB \
  -C -i database/schema.sql

sqlcmd -S prius.database.windows.net \
  -U wewon2018 -P "<password>" \
  -d Problems4UsDB \
  -C -i database/seed.sql
```

### Azure OpenAI (Optional)

```bash
# Create Cognitive Services account
az cognitiveservices account create \
  --name problems4us-openai \
  --resource-group rg-problems4us \
  --kind OpenAI \
  --sku S0 \
  --location eastus2

# Deploy a model
az cognitiveservices account deployment create \
  --name problems4us-openai \
  --resource-group rg-problems4us \
  --deployment-name gpt-4 \
  --model-name gpt-4 \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard
```

## Step 2: Deploy with Azure App Service

### Create App Service Plan

```bash
az appservice plan create \
  --name problems4us-plan \
  --resource-group rg-problems4us \
  --sku B1 \
  --is-linux

az webapp create \
  --name problems4us \
  --resource-group rg-problems4us \
  --plan problems4us-plan \
  --runtime "NODE:18-lts"
```

### Configure Environment Variables

```bash
az webapp config appsettings set \
  --name problems4us \
  --resource-group rg-problems4us \
  --settings \
    AI_PROVIDER=azure-openai \
    AZURE_OPENAI_ENDPOINT=https://problems4us-openai.openai.azure.com/ \
    AZURE_OPENAI_API_KEY=<key> \
    AZURE_OPENAI_DEPLOYMENT=gpt-4 \
    AZURE_OPENAI_API_VERSION=2024-02-01 \
    AZURE_SQL_CONNECTION_STRING="Server=tcp:problems4us-sql.database.windows.net,1433;Database=problems4us;..." \
    ADMIN_API_KEY="<generate-a-long-random-secret>" \
    NEXT_PUBLIC_APP_URL=https://problems4us.com
```

`ADMIN_API_KEY` protects owner-only endpoints (`/api/sources*`, `/api/ingest/*`, `/api/ai/*`) and the `/admin` console. Without it, those endpoints return `503`. Public browse APIs remain open.

### Build & Deploy

```bash
# Build for production (standalone output)
npm run build

# Deploy using ZIP
cd .next/standalone
zip -r ../../deploy.zip .
cd ../..
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

az webapp deploy \
  --name problems4us \
  --resource-group rg-problems4us \
  --src-path deploy.zip \
  --type zip
```

### Configure Startup Command

```bash
az webapp config set \
  --name problems4us \
  --resource-group rg-problems4us \
  --startup-file "node server.js"
```

## Step 3: Custom Domain (problems4us.com)

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name problems4us \
  --resource-group rg-problems4us \
  --hostname problems4us.com

# Enable managed SSL
az webapp config ssl bind \
  --name problems4us \
  --resource-group rg-problems4us \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

### DNS Configuration

Add these DNS records at your domain registrar:

| Type | Name | Value |
|------|------|-------|
| A | @ | App Service IP |
| CNAME | www | problems4us-linux.azurewebsites.net |
| TXT | asuid | Verification ID from Azure |

## Alternative: Azure Static Web Apps

For a simpler deployment with automatic CI/CD:

```bash
az staticwebapp create \
  --name problems4us-static \
  --resource-group rg-problems4us \
  --source https://github.com/your-org/problems4us \
  --branch main \
  --app-location "/" \
  --api-location "" \
  --output-location ".next"
```

## Monitoring

### Application Insights

```bash
az monitor app-insights component create \
  --app problems4us-insights \
  --location eastus2 \
  --resource-group rg-problems4us

# Link to web app
az webapp config appsettings set \
  --name problems4us \
  --resource-group rg-problems4us \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING=<connection-string>
```

## Cost Estimate (MVP)

| Resource | SKU | Estimated Monthly Cost |
|----------|-----|----------------------|
| App Service | B1 | ~$13 |
| SQL Database | S0 (10 DTU) | ~$15 |
| Azure OpenAI | Pay-as-you-go | ~$5-50 (varies) |
| **Total** | | **~$33-78/month** |

## Waitlist + pricing funnel (M1.4)

Production auto-creates `WaitlistEntries` and `ConversionEvents` on first write.
Optional manual migration: `database/migrations/20260717_waitlist_pricing.sql`.

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/waitlist` | Public | Persist early-access email (`source`: landing/pricing-*) |
| `GET /api/waitlist` | `ADMIN_API_KEY` | List / count waitlist |
| `POST /api/events` | Public | Funnel events (`pricing_view`, `waitlist_success`, …) |
| `/pricing` | Public | Early-access pricing surface |

Owner ops: `curl -H "x-admin-api-key: $ADMIN_API_KEY" https://problems4us.com/api/waitlist?countOnly=1`

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: azure/webapps-deploy@v3
        with:
          app-name: problems4us
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .next/standalone
```
