# OwnStats Installation Guide (current state, corrected)

This document covers the current working command flow for creating and deploying an OwnStats installation in AWS. These notes document what currently works, what does not, and what requires manual intervention during setup.

## 1. Install the OwnStats CLI

```bash
npm install -g ownstats
```

## 2. Create a local OwnStats installation

```bash
ownstats installation create -d -p ~/ -n ownstats-installation
cd ~/ownstats-installation
```

This bootstraps a local OwnStats installation directory.

## 3. Configure the installation

Set the AWS region:
```bash
ownstats config set aws-region us-east-1
```

Set the AWS profile:
```bash
ownstats config set aws-profile my-profile
```

Set the stage:
```bash
ownstats config set aws-stage prd
```

## 4. Deploy the backend

Install backend dependencies:
```bash
ownstats stack install backend
```

Deploy the backend:
```bash
ownstats stack deploy backend
```

## 5. Deploy the frontend

Install frontend dependencies:
```bash
ownstats stack install frontend
```

Build the frontend:
```bash
ownstats stack build frontend
```

Sync the frontend:
```bash
ownstats stack sync frontend
```

## 6. Build and deploy the client

Install client dependencies:
```bash
ownstats stack install client
```

Build the client:
```bash
ownstats stack build client
```

Sync the client:
```bash
ownstats stack sync client
```

## 7. Create a user

```bash
ownstats user create
```

This creates a Cognito user for the OwnStats frontend.

## 8. Open the frontend

```bash
ownstats stack open frontend
```

If this prints an invalid or undefined URL, use the frontend CloudFront domain from the backend stack outputs directly.

## 9. Add domains

After logging in, add the domain in the Domains section of the frontend.

Example domain format:
```
example.com
```

Then use the generated tracking snippet in the `<head>` of the target site:

```html
<script src="https://example.cloudfront.net/go.js" data-domainkey="8dsfd8g68d8fg" async></script>
```

The `data-domainkey` attribute is required.

---

## OwnStats Installation Notes / Known Issues

### Docs and CLI are out of sync

The public installation doc did not match the current CLI in several places.

**Did not work:**
- `ownstats config set stage prd`
- `ownstats stack backend install`
- `ownstats stack backend deploy`

**Did work:**
- `ownstats stack install backend`
- `ownstats config set aws-stage prd`
- `ownstats stack deploy backend`

### Config files not auto-populated

The install command created a local repo structure, but some config/state that later steps depend on were not being populated automatically.

These required manual population:
- `.ownstats.json`
- `frontend/src/ownstats.config.json`

Even after backend deployment succeeded, local metadata remained incomplete. Examples:
- `stacksDeployed.backend` remained `false`
- `cognito`, `frontend`, and `backend` values were incomplete or empty

This affected: frontend build, frontend sync, client sync, and user creation.

### Manual config population

The listed local config files were not populated automatically during installation, even though later commands expected them to exist.

#### `.ownstats.json`

Populate these sections from backend stack outputs:

| Field | Backend Stack Output |
|---|---|
| `frontend.cdnBucketName` | `FrontendBucketName` |
| `frontend.cdnDistributionId` | `FrontendCloudFrontDistributionId` |
| `frontend.domainName` | `FrontendCloudFrontDistributionDomainName` |
| `backend.cdnBucketName` | `DistributionBucketName` |
| `backend.cdnDistributionId` | `CloudFrontDistributionId` |
| `backend.cdnDomainName` | `CloudFrontDistributionDomainName` |
| `cognito.userPoolId` | `UserPoolId` |
| `cognito.userPoolClientId` | `UserPoolClientId` |
| `cognito.identityPoolId` | `IdentityPoolId` |

#### `frontend/src/ownstats.config.json`

Create this file manually from backend outputs with these mappings:

| Field | Backend Stack Output |
|---|---|
| `region` | AWS region used for deploy |
| `cognito.userPoolId` | `UserPoolId` |
| `cognito.userPoolClientId` | `UserPoolClientId` |
| `cognito.identityPoolId` | `IdentityPoolId` |
| `backend.apiUrl` | `ApiUrl` |
| `backend.streamingQueryUrl` | `StreamingQueryUrl` |
| `s3.bucketName` | `CuratedBucketName` |
| `cdn.domainName` | `CloudFrontDistributionDomainName` |

### AWS SSO/profile handling

The install flow was more sensitive to AWS auth state than the docs implied.

Observed issues:
- SSO/profile resolution was fragile
- Serverless did not reliably honor the expected named profile behavior
- Exported temp credentials were more reliable than relying on profile resolution alone

### The dashboard historical view has a first-run bootstrap problem

After deployment, tracking worked and data flowed into upstream buckets, but the dashboard historical view failed because it expected:

```
curated/duckdb/data.duckdb
```

That file was not present initially.

After inspection:
- `aggregateStats` is the function intended to create/update that DuckDB file
- It tries to aggregate yesterday's parquet data
- On a fresh install, there is no previous day of data yet
- Therefore it fails before it can create the initial historical DB
- Resolves on its own after the first day of data collection

---

## Resources

- [GitHub: ownstats/ownstats](https://github.com/ownstats/ownstats)
- [OwnStats Installation Docs](https://docs.ownstats.com/getting-started/installation/)
