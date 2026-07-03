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
   yarn strapi transfer --to https://<your-strapi-cloud>/admin --force
   ```

## Env

Set in `frequenza-strapi-cms/.env`:

- `STRAPI_URL` — default `http://localhost:1337`
- `STRAPI_API_TOKEN` — read token for export

Seed uses local Strapi bootstrap (no token).
