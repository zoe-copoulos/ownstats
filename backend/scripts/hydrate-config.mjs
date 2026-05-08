import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import AWS from 'aws-sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

async function readConfig() {
  const raw = await readFile(resolve(ROOT, '.ownstats.json'), 'utf-8');
  return JSON.parse(raw);
}

// Required output keys and where they map in .ownstats.json
const OUTPUT_MAP = [
  { key: 'FrontendBucketName',                      path: ['frontend', 'cdnBucketName'] },
  { key: 'FrontendCloudFrontDistributionId',         path: ['frontend', 'cdnDistributionId'] },
  { key: 'FrontendCloudFrontDistributionDomainName', path: ['frontend', 'domainName'] },
  { key: 'DistributionBucketName',                   path: ['backend', 'cdnBucketName'] },
  { key: 'CloudFrontDistributionId',                 path: ['backend', 'cdnDistributionId'] },
  { key: 'CloudFrontDistributionDomainName',         path: ['backend', 'cdnDomainName'] },
  { key: 'ApiUrl',                                   path: ['backend', 'apiUrl'] },
  { key: 'StreamingQueryUrl',                        path: ['backend', 'streamingQueryUrl'] },
  { key: 'UserPoolId',                               path: ['cognito', 'userPoolId'] },
  { key: 'UserPoolClientId',                         path: ['cognito', 'userPoolClientId'] },
  { key: 'IdentityPoolId',                           path: ['cognito', 'identityPoolId'] },
  { key: 'CuratedBucketName',                        path: ['s3', 'bucketName'] },
];

function setNested(obj, [head, ...tail], value) {
  if (!obj[head]) obj[head] = {};
  if (tail.length === 0) {
    obj[head] = value;
  } else {
    setNested(obj[head], tail, value);
  }
}

async function main() {
  const config = await readConfig();
  const { id, aws: { region, stage, profile } } = config;

  if (!id || !region || !stage) {
    console.error('ERROR: .ownstats.json is missing required fields: id, aws.region, aws.stage');
    process.exit(1);
  }

  if (profile) {
    AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile });
  }
  AWS.config.region = region;

  const cf = new AWS.CloudFormation();
  const stackName = `ownstats-${id}-backend-${stage}`;

  console.log(`Fetching outputs from CloudFormation stack: ${stackName}`);

  let outputs;
  try {
    const result = await cf.describeStacks({ StackName: stackName }).promise();
    outputs = result.Stacks?.[0]?.Outputs ?? [];
  } catch (err) {
    console.error(`ERROR: Could not describe stack "${stackName}": ${err.message}`);
    process.exit(1);
  }

  const outputMap = Object.fromEntries(outputs.map(o => [o.OutputKey, o.OutputValue]));

  // Validate all required keys are present before writing anything
  const missing = OUTPUT_MAP.map(m => m.key).filter(k => !(k in outputMap));
  if (missing.length > 0) {
    console.error('ERROR: The following CloudFormation outputs are missing from the stack response:');
    missing.forEach(k => console.error(`  - ${k}`));
    console.error('No files were written. Ensure the backend stack deployed successfully.');
    process.exit(1);
  }

  // Hydrate .ownstats.json
  for (const { key, path } of OUTPUT_MAP) {
    setNested(config, path, outputMap[key]);
  }
  // cdn.domainName reuses CloudFrontDistributionDomainName (backend CDN)
  setNested(config, ['cdn', 'domainName'], outputMap['CloudFrontDistributionDomainName']);
  if (!config.stacksDeployed) config.stacksDeployed = {};
  config.stacksDeployed.backend = true;

  await writeFile(resolve(ROOT, '.ownstats.json'), JSON.stringify(config, null, 2) + '\n');
  console.log('Updated .ownstats.json');

  // Generate frontend/src/ownstats.config.json
  const frontendConfig = {
    region,
    cognito: {
      userPoolId: outputMap['UserPoolId'],
      userPoolClientId: outputMap['UserPoolClientId'],
      identityPoolId: outputMap['IdentityPoolId'],
    },
    backend: {
      apiUrl: outputMap['ApiUrl'],
      streamingQueryUrl: outputMap['StreamingQueryUrl'],
    },
    s3: {
      bucketName: outputMap['CuratedBucketName'],
    },
    cdn: {
      domainName: outputMap['CloudFrontDistributionDomainName'],
    },
  };

  await writeFile(
    resolve(ROOT, 'frontend/src/ownstats.config.json'),
    JSON.stringify(frontendConfig, null, 2) + '\n'
  );
  console.log('Generated frontend/src/ownstats.config.json');
  console.log('Done. You can now run: ownstats stack build frontend && ownstats stack sync frontend');
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
