'use strict';

const { parseMediaUrl, fetchOEmbedTitle } = require('./api/media-item/utils/parse-media-url');

module.exports = async function backfillMediaItemKeys(strapi) {
  const store = strapi.store({
    environment: strapi.config.environment,
    type: 'type',
    name: 'setup',
  });

  const alreadyRan = await store.get({ key: 'mediaItemKeysBackfilledV2' });
  if (alreadyRan) {
    return;
  }

  const items = await strapi.db.query('api::media-item.media-item').findMany({
    select: ['id', 'document_id', 'url', 'key', 'title', 'type'],
  });

  let updated = 0;

  for (const item of items) {
    if (!item.url) continue;

    try {
      const parsed = parseMediaUrl(item.url);
      let title = item.title;

      if (!title || title === item.key || title === parsed.fallbackTitle) {
        const oembedTitle = await fetchOEmbedTitle(parsed.url, parsed.type);
        title = oembedTitle || parsed.fallbackTitle;
      }

      const needsUpdate =
        item.key !== parsed.key ||
        item.type !== parsed.type ||
        item.url !== parsed.url ||
        item.title !== title;

      if (!needsUpdate) continue;

      await strapi.db.query('api::media-item.media-item').update({
        where: { id: item.id },
        data: {
          key: parsed.key,
          type: parsed.type,
          url: parsed.url,
          title,
        },
      });

      updated += 1;
    } catch (error) {
      strapi.log.warn(
        `Media item backfill skipped for id ${item.id}: ${error.message}`
      );
    }
  }

  await store.set({ key: 'mediaItemKeysBackfilledV2', value: true });

  if (updated > 0) {
    strapi.log.info(`Backfilled ${updated} media item key/title values.`);
  }
};
