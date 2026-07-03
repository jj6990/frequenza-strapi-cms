'use strict';

const { errors } = require('@strapi/utils');
const { parseMediaUrl, fetchOEmbedTitle } = require('../../utils/parse-media-url');

function getDocumentId(record) {
  return record?.document_id ?? record?.documentId ?? null;
}

function buildDuplicateLookupConditions(parsed) {
  const conditions = [{ key: parsed.key }, { url: parsed.url }];

  if (parsed.type === 'youtube') {
    const videoId = parsed.key.replace(/^youtube:/, '');
    conditions.push({ key: videoId });
  }

  if (parsed.type === 'soundcloud') {
    conditions.push({ key: parsed.url });
  }

  return conditions;
}

async function findPublishedDuplicate(parsed, excludeDocumentId) {
  const matches = await strapi.db.query('api::media-item.media-item').findMany({
    where: {
      $and: [
        { $or: buildDuplicateLookupConditions(parsed) },
        { published_at: { $notNull: true } },
      ],
    },
    select: ['id', 'document_id', 'key', 'title'],
  });

  return (
    matches.find(item => {
      const docId = getDocumentId(item);
      return (
        !excludeDocumentId ||
        !docId ||
        String(docId) !== String(excludeDocumentId)
      );
    }) || null
  );
}

async function removeOrphanDrafts(parsed, excludeDocumentId) {
  const drafts = await strapi.db.query('api::media-item.media-item').findMany({
    where: {
      $and: [
        { $or: buildDuplicateLookupConditions(parsed) },
        { published_at: { $null: true } },
      ],
    },
    select: ['id', 'document_id'],
  });

  for (const draft of drafts) {
    const docId = getDocumentId(draft);

    if (
      excludeDocumentId &&
      docId &&
      String(docId) === String(excludeDocumentId)
    ) {
      continue;
    }

    if (!draft.id) continue;

    await strapi.db.query('api::media-item.media-item').delete({
      where: { id: draft.id },
    });
  }
}

async function enrichMediaItemData(data, options = {}) {
  const { skipTitleFetch = false, documentId = null, isCreate = false } =
    options;

  if (!data?.url) {
    throw new errors.ApplicationError('URL is required.');
  }

  const parsed = parseMediaUrl(data.url);

  data.url = parsed.url;
  data.type = parsed.type;
  data.key = parsed.key;

  if (!skipTitleFetch || !data.title) {
    const oembedTitle = await fetchOEmbedTitle(parsed.url, parsed.type);
    data.title = oembedTitle || parsed.fallbackTitle;
  }

  const excludeDocumentId =
    documentId || data.documentId || data.document_id || null;

  if (isCreate) {
    await removeOrphanDrafts(parsed, excludeDocumentId);
  }

  const duplicate = await findPublishedDuplicate(parsed, excludeDocumentId);

  if (duplicate) {
    const label = duplicate.title || duplicate.key || 'existing track';
    throw new errors.ApplicationError(
      `This track already exists as "${label}". Pick it from the relation list instead of creating a duplicate.`
    );
  }
}

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    await enrichMediaItemData(data, {
      documentId: data.documentId || data.document_id,
      isCreate: true,
    });
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;

    if (!data?.url) return;

    const existing = await strapi.db.query('api::media-item.media-item').findOne({
      where,
      select: ['id', 'document_id', 'url', 'title'],
    });

    const urlChanged = existing?.url !== data.url;
    await enrichMediaItemData(
      { ...data, id: existing?.id },
      {
        skipTitleFetch: !urlChanged && Boolean(existing?.title),
        documentId:
          getDocumentId(existing) || data.documentId || data.document_id,
      }
    );
  },
};
