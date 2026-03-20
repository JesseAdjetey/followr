/**
 * Followr — Gmail API Client
 */

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { createServiceSupabaseClient } from './supabase-server'

export function getOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/** Load tokens from Supabase settings for userId, wire up token refresh → save back */
export async function getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
  const supabase = createServiceSupabaseClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry')
    .eq('user_id', userId)
    .single()

  if (!settings?.gmail_refresh_token) {
    throw new Error('No Gmail tokens found for user')
  }

  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: settings.gmail_access_token,
    refresh_token: settings.gmail_refresh_token,
    expiry_date: settings.gmail_token_expiry ? new Date(settings.gmail_token_expiry).getTime() : undefined,
  })

  // Auto-refresh: save new tokens back to Supabase when refreshed
  oauth2Client.on('tokens', async (tokens) => {
    const update: Record<string, string> = {}
    if (tokens.access_token) update.gmail_access_token = tokens.access_token
    if (tokens.expiry_date) update.gmail_token_expiry = new Date(tokens.expiry_date).toISOString()
    if (Object.keys(update).length > 0) {
      await supabase.from('settings').update(update).eq('user_id', userId)
    }
  })

  return oauth2Client
}

/** Use gmail.users.history.list to get new messages since historyId */
export async function getNewMessagesSince(userId: string, historyId: string): Promise<string[]> {
  const auth = await getAuthenticatedClient(userId)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: historyId,
    historyTypes: ['messageAdded'],
  })

  const messageIds: string[] = []
  for (const record of res.data.history ?? []) {
    for (const added of record.messagesAdded ?? []) {
      if (added.message?.id) messageIds.push(added.message.id)
    }
  }
  return messageIds
}

/** Use gmail.users.messages.get, parse headers + decode body */
export async function getMessage(userId: string, messageId: string) {
  const auth = await getAuthenticatedClient(userId)
  const gmail = google.gmail({ version: 'v1', auth })

  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })

  const msg = res.data
  const headers = msg.payload?.headers ?? []
  const get = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

  const body = decodeBody(msg.payload)

  return {
    id: msg.id!,
    threadId: msg.threadId!,
    subject: get('Subject'),
    from: get('From'),
    to: get('To'),
    cc: get('Cc'),
    date: get('Date'),
    snippet: msg.snippet ?? '',
    body,
  }
}

function decodeBody(payload: any): string {
  if (!payload) return ''
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8')
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8')
      }
    }
    for (const part of payload.parts) {
      const nested = decodeBody(part)
      if (nested) return nested
    }
  }
  return ''
}

export function isWatchedAddressCCd(ccHeader: string, watchedAddress: string): boolean {
  if (!ccHeader || !watchedAddress) return false
  return ccHeader.toLowerCase().includes(watchedAddress.toLowerCase())
}

export function isReplyFromRecipient(messageFrom: string, recipientEmail: string, userEmail: string): boolean {
  const fromEmail = extractEmail(messageFrom)
  return fromEmail.toLowerCase() === recipientEmail.toLowerCase() && fromEmail.toLowerCase() !== userEmail.toLowerCase()
}

/** Build RFC 2822 message, encode as base64url, send via gmail.users.messages.send */
export async function sendReply(
  userId: string,
  gmailThreadId: string,
  inReplyToMessageId: string,
  subject: string,
  body: string
): Promise<string | null> {
  const auth = await getAuthenticatedClient(userId)
  const gmail = google.gmail({ version: 'v1', auth })

  // Get user's email for the From header
  const oauth2 = google.oauth2({ version: 'v2', auth })
  const userInfo = await oauth2.userinfo.get()
  const fromEmail = userInfo.data.email!

  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`
  const rawMessage = [
    `From: ${fromEmail}`,
    `In-Reply-To: <${inReplyToMessageId}>`,
    `References: <${inReplyToMessageId}>`,
    `Subject: ${replySubject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n')

  const encoded = Buffer.from(rawMessage).toString('base64url')

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encoded,
      threadId: gmailThreadId,
    },
  })

  return res.data.id ?? null
}

/** Call gmail.users.watch with Pub/Sub topic */
export async function startGmailWatch(userId: string): Promise<{ historyId: string; expiration: string } | null> {
  const auth = await getAuthenticatedClient(userId)
  const gmail = google.gmail({ version: 'v1', auth })

  const topicName = process.env.GOOGLE_PUBSUB_TOPIC
  if (!topicName) {
    console.warn('GOOGLE_PUBSUB_TOPIC not set — skipping Gmail watch')
    return null
  }

  const res = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX'],
    },
  })

  return {
    historyId: res.data.historyId!,
    expiration: res.data.expiration!,
  }
}

export function extractEmail(header: string): string {
  const match = header.match(/<(.+?)>/)
  return match ? match[1].trim() : header.trim()
}

export function extractName(header: string): string {
  const match = header.match(/^(.+?)\s*</)
  if (match) return match[1].trim().replace(/^"|"$/g, '')
  return extractEmail(header)
}

export function substituteVariables(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match)
}

// Alias used by scheduler.ts
export { substituteVariables as substituteVars }

/** Get an authenticated Gmail API client (for use in background jobs) */
export async function getGmailClient(userId: string) {
  const auth = await getAuthenticatedClient(userId)
  return google.gmail({ version: 'v1', auth })
}
