import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/functions/oidc'

const globalForDynamo = globalThis as typeof globalThis & {
  pulseAidDb?: DynamoDBDocumentClient
}

const region = process.env.AWS_REGION ?? 'us-east-1'

function resolveCredentials() {
  if (process.env.AWS_ROLE_ARN) {
    return awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN,
      clientConfig: { region },
    })
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  }

  return undefined
}

const client = new DynamoDBClient({
  region,
  credentials: resolveCredentials(),
})

export const SESSION_TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME ?? 'PulseAidSessions'

export const db =
  globalForDynamo.pulseAidDb ?? DynamoDBDocumentClient.from(client)

if (process.env.NODE_ENV !== 'production') {
  globalForDynamo.pulseAidDb = db
}
