# Private message inbox

The calendar widget saves through `/api/messages`. Production uses the existing private Vercel Blob document `itsme/store.json`; local development uses `.data/store.json`. This is persistent document storage, not a relational database. ETag-conditional writes protect concurrent changes. A save finishes before the visitor sees success.

## Owner access

Open `/inbox/`. Its public HTML is an empty login shell marked noindex. No credentials or messages are embedded in HTML or JavaScript.

Set `INBOX_PASSWORD_HASH` to a salted scrypt hash created by `hashInboxPassword` in `hosting/message-inbox.mjs`. Keep the plaintext password only in the owner's private credential file or password manager. Never put it in source, public assets, logs or URLs.

Sessions use random 256-bit opaque tokens in HttpOnly, Secure, SameSite=Strict, host-only cookies. HTTP localhost is the development exception. Only token hashes are persisted. Sessions expire after seven days, logout revokes the token, and changing the password hash invalidates existing sessions. Login attempts are limited per hashed address in persistent storage. State changes require matching Origin. Unauthenticated list, status and CSV requests are rejected.

## Reading messages

The inbox shows message content, optional reply address, received time in Asia/Seoul and read/unread status. It supports search, unread filtering, refresh and CSV export. CSV uses UTF-8 BOM for Korean Excel and escapes formula-like values. Message content is rendered as plain text. Reply links open the owner's mail app; no automatic email is sent.

FormSubmit, its notification endpoint and cron have been removed. Google Sheets is not synchronized automatically. CSV can be opened in Excel or imported into a private Google spreadsheet.

For local development run `node --env-file=.env.inbox.local tools/serve.mjs`. `npm run messages:inbox` reads local saved notes. Existing stored messages and notification history remain intact. Never expose `.env*`, `.data`, or the private Blob token.
