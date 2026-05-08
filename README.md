# Ownstats
Host your own privacy-effective website analytics on AWS, serverlessly!

The current version of Ownstats is described (and further developed) in a series of blog posts at [www.tobilg.com](https://www.tobilg.com). This repository holds the code and IaC for the series, and is designed as a monorepo that will consist of different packages, which will be added with every new part of the blog series.

## Packages
* [backend](backend/README.md): The backend infrastructure to enable to sending of web analytics data, transformation and enrichtment, as well as persisting the data in S3
* [frontend](frontend/README.md): The frontend application, which is a React application that makes use of DuckDB WASM
* [client](client/README.md): The JavaScript client library, which can be used to send analytics data to the backend

## Prerequisites
* A local installation of Node 18+
* An AWS account with the necessary permissions to create resources needed for the project, as well as locally configured AWS credentials for deploying to AWS
* A local installation of [Serverless Framework v3 (not v4!)](https://www.serverless.com/framework/docs/getting-started/)
* A local installation of [npm](https://docs.npmjs.com/cli/v11/commands/npm)

## Quick Start

> **Note:** The commands below reflect the current CLI behavior. Some examples in the external docs at [docs.ownstats.com](https://docs.ownstats.com) use outdated syntax.

```bash
# Install the CLI
npm install -g ownstats

# Bootstrap a local installation
ownstats installation create -d -p ~/ -n ownstats-installation
cd ~/ownstats-installation

# Configure (note: aws-region, aws-stage, aws-profile — not region/stage/profile)
ownstats config set aws-region us-east-1
ownstats config set aws-profile my-profile
ownstats config set aws-stage prd

# Deploy backend (note: verb before target — not "ownstats stack backend deploy")
ownstats stack install backend
ownstats stack deploy backend

# Hydrate config from CloudFormation outputs (required before frontend/client steps)
cd <path-to-this-repo>/backend && npm run hydrate && cd -

# Build and deploy frontend
ownstats stack install frontend
ownstats stack build frontend
ownstats stack sync frontend

# Build and deploy client
ownstats stack install client
ownstats stack build client
ownstats stack sync client

# Create a user and open the dashboard
ownstats user create
ownstats stack open frontend
```

## Documentation
The documentation for the current version of Ownstats is available at [docs.ownstats.com](https://docs.ownstats.com).
