# Private contact notes

The calendar widget posts to `/api/messages`. The server validates and saves the message before acknowledging it. Local data stays in `.data/store.json`; Vercel uses the existing private Blob store. Public endpoints never list notes or reply addresses.

## Notification setup

- `CONTACT_NOTIFY_EMAIL`: fixed owner email, configured on the server only.
- `CRON_SECRET`: random secret of at least 32 characters for the private retry endpoint.
- Notifications use FormSubmit's documented AJAX endpoint. Activate the owner address once using its confirmation email, then verify a test message in the actual recipient inbox before promotion.
- A visitor's optional email is used as Reply-To. The recipient and subject prefix cannot be supplied by a visitor.

For local testing, put the notification address in an ignored `.env.notifications.local` file and run `node --env-file=.env.notifications.local tools/serve.mjs`. Ordinary tests do not load this file or send real email. `npm run messages:inbox` reads local messages and notification status.

## Delivery behavior

Vercel `waitUntil` keeps the notification task alive after the saved-message response. Each send first acquires a persisted lease so concurrent submissions or retries do not send the same message simultaneously. Accepted notifications are skipped thereafter. `accepted` means the mail provider acknowledged the request, not that the recipient inbox was independently checked.

Failed attempts remain in the private store with a backoff. An authenticated daily Vercel cron checks up to two queued messages at 00:00 UTC; authenticated POST requests to `/api/message-notifications` can run the same retry manually. A repeated submission of the same message ID also tries a due notification. The original message is retained if delivery fails.

Provider timeouts are ambiguous: an email might have been accepted before its response was lost. Because FormSubmit has no documented idempotency key, a later retry can produce a duplicate email; the stable reference ID identifies it. The stored message itself is deduplicated.

The provider documents 30-day submission retention. References: https://formsubmit.co/documentation and https://formsubmit.co/help.
