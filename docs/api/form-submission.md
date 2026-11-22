# Public form submission API

`POST /api/forms/{FORM_ID}/submit`

Submit a response to a form created in MailCast. No authentication is required —
this endpoint is meant to be called from a public website. `OPTIONS` is supported
for CORS preflight; responses allow `*` origin, `POST, OPTIONS` methods and the
`Content-Type` header.

## Request body

Any of these content types work:

- `application/json` — a flat object of field names to string values
- `application/x-www-form-urlencoded`
- `multipart/form-data` (string fields only; file parts are ignored)

Use the **field names** configured in the form builder as keys. Matching is
case-insensitive. `email` is always required; any field marked *required* in the
form must also be present and non-empty. Extra keys are stored in the submission
data but do not cause an error.

Reserved keys with special handling:

| Key | Behaviour |
| --- | --- |
| `email` (`EMAIL`, `Email`) | Required. Becomes the contact's email address. |
| `name` (`NAME`, `Name`, `full_name`) | Stored as the contact's name and in the submission data. |
| `telegram` (`Telegram`, `telegram_username`, `handle`) | Leading `@` is stripped; stored on the contact. |

## Responses

Success — `200`:

```json
{ "ok": true, "message": "Thanks for subscribing!" }
```

Validation failure — `400`:

```json
{ "ok": false, "error": "A valid email is required" }
```

or

```json
{ "ok": false, "error": "Missing required fields: company" }
```

Unknown form — `404` with `{ "ok": false, "error": "Form not found" }`.

Every 2xx/4xx response includes the CORS headers listed above.

## Side effects of a successful submission

1. Upserts a contact by email (adding the form's configured tags).
2. Creates a `FormSubmission` record with the extra fields as JSON.
3. Adds the contact to the form's linked group, if one is configured.
4. Enrolls the contact in any matching automations.

## Examples

JSON:

```bash
curl -X POST https://your-app.example/api/forms/FORM_ID/submit \
  -H 'Content-Type: application/json' \
  -d '{"email":"reader@example.com","name":"Jane","company":"Acme"}'
```

HTML form data:

```bash
curl -X POST https://your-app.example/api/forms/FORM_ID/submit \
  -d 'email=reader%40example.com&name=Jane&company=Acme'
```

The form builder's **Embed** dialog generates ready-to-paste HTML and JavaScript
snippets that target this endpoint.
