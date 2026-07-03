# i18n seed data

Reproducible Spanish → English localization pipeline for Strapi.

## Workflow

1. **Export** current CMS content (Spanish text, often tagged `locale=en`):
   ```bash
   yarn i18n:export
   ```
   Writes `es-source.json`.

2. **Translate** localized fields to English and save as `en-seed.json`.
   - Keep the same `documentId`s and structure.
   - Translate strings, CKEditor HTML text, and blocks `children[].text` only.
   - Generate English slugs from translated titles.

3. **Validate** structure before seeding:
   ```bash
   yarn i18n:validate
   ```

4. **Seed** `es` + `en` localizations locally:
   ```bash
   yarn i18n:seed
   yarn i18n:seed -- --dry-run   # preview only
   ```

5. **Transfer** seeded DB to production when ready:
   ```bash
   # Prerequisites:
   # - Strapi Cloud on 5.50.0 (yarn strapi login && yarn strapi link && yarn strapi deploy)
   # - Admin → Settings → Internationalization: es (default) + en, fallback en → es
   # - Fresh STRAPI_TRANSFER_TOKEN in .env (rotate if exposed)
   # - Local DB seeded with yarn i18n:seed
   yarn strapi transfer --to https://radiant-warmth-68ec252025.strapiapp.com/admin --force
   ```

6. **Prod API smoke** (before deploying frqz-web):
   ```bash
   curl -s "$STRAPI_URL/api/home-hero?locale=es" | jq .data.title
   curl -s "$STRAPI_URL/api/home-hero?locale=en" | jq .data.title
   ```

7. **Deploy frqz-web** only after prod CMS checks pass (Vercel auto-deploy from `main`).

## Env

Set in `frequenza-strapi-cms/.env`:

- `STRAPI_URL` — default `http://localhost:1337`
- `STRAPI_API_TOKEN` — read token for export

Seed uses local Strapi bootstrap (no token).
