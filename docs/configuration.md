# Configuration

Environment variables are read from `.env` (see `.env copy backup` for a local
template). Important values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite database file used by Prisma. |
| `ENCRYPTION_KEY` | 32-byte hex key used to encrypt Gmail app passwords at rest. A fixed development fallback is used when unset. |
| `APP_URL` | **Recommended.** Public origin of this app, e.g. `https://mail.example.com`. Used to build absolute URLs for uploaded images and tracking links inside outgoing emails. When unset, the app derives the origin from the `x-forwarded-proto` and `x-forwarded-host`/`host` headers of the request that starts a broadcast. Set it explicitly when sending from a server or when the public origin differs from the internal one. |

Trailing slashes on `APP_URL` are removed automatically.

Uploaded images are stored in the database and served from `/api/files/[id]`.
Tracking endpoints live at `/api/t/[token]` on the same origin.
