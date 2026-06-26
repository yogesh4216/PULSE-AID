import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import type { SessionData } from './types'

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME
const PK = process.env.DYNAMODB_TABLE_PARTITION_KEY || 'id'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN as string,
    clientConfig: { region: process.env.AWS_REGION },
  }),
})

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

export async function createSession(session: SessionData): Promise<SessionData> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { [PK]: session.id, ...session },
    }),
  )
  return session
}

export async function getSession(id: string): Promise<SessionData | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { [PK]: id },
    }),
  )
  return (result.Item as SessionData) || null
}

export async function updateSession(
  id: string,
  updates: Partial<SessionData>,
): Promise<SessionData | null> {
  const entries = Object.entries(updates).filter(
    ([key, value]) => key !== 'id' && key !== PK && value !== undefined,
  )

  if (entries.length === 0) {
    return getSession(id)
  }

  const setParts: string[] = []
  const names: Record<string, string> = {}
  const values: Record<string, unknown> = {}

  entries.forEach(([key, value], i) => {
    setParts.push(`#k${i} = :v${i}`)
    names[`#k${i}`] = key
    values[`:v${i}`] = value
  })

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { [PK]: id },
      UpdateExpression: `SET ${setParts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }),
  )

  return (result.Attributes as SessionData) || null
}

export async function getRecentSessions(limit = 10): Promise<SessionData[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 50,
    }),
  )
  const sessions = (result.Items || []) as SessionData[]
  return sessions
    .filter((s) => typeof s.createdAt === 'number')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
}
