'use strict';

const MEDIA_ITEM_UID = 'api::media-item.media-item';
const MEDIA_PLAYER_UID = 'api::media-player.media-player';

const mediaItemContentManagerConfig = {
  uid: MEDIA_ITEM_UID,
  settings: {
    bulkable: true,
    filterable: true,
    searchable: true,
    pageSize: 10,
    mainField: 'title',
    defaultSortBy: 'title',
    defaultSortOrder: 'ASC',
  },
  metadatas: {
    url: {
      edit: {
        label: 'URL',
        description:
          'Paste a YouTube or SoundCloud link. Title, type, and key are filled automatically when you save.',
        placeholder: 'https://...',
        visible: true,
        editable: true,
      },
      list: { label: 'URL', searchable: true, sortable: true },
    },
    key: {
      edit: {
        label: 'Key',
        description: 'Auto-generated from the URL on save.',
        visible: false,
        editable: false,
      },
      list: { label: 'Key', searchable: true, sortable: true },
    },
    title: {
      edit: {
        label: 'Title',
        description: 'Auto-filled from oEmbed on save.',
        visible: false,
        editable: false,
      },
      list: { label: 'Title', searchable: true, sortable: true },
    },
    type: {
      edit: {
        label: 'Type',
        description: 'Auto-detected from the URL.',
        visible: false,
        editable: false,
      },
      list: { label: 'Type', searchable: true, sortable: true },
    },
    media_player: {
      edit: {
        label: 'Playlist',
        description: 'Which Media Player playlist this track belongs to.',
        visible: true,
        editable: true,
        mainField: 'title',
      },
      list: { label: 'Playlist', searchable: false, sortable: false },
    },
  },
  layouts: {
    list: ['title', 'type', 'url', 'media_player'],
    edit: [
      [{ name: 'url', size: 12 }],
      [{ name: 'media_player', size: 12 }],
    ],
  },
};

const mediaPlayerContentManagerConfig = {
  uid: MEDIA_PLAYER_UID,
  settings: {
    bulkable: true,
    filterable: true,
    searchable: true,
    pageSize: 10,
    mainField: 'title',
    defaultSortBy: 'title',
    defaultSortOrder: 'ASC',
  },
  metadatas: {
    title: {
      edit: {
        label: 'Playlist title',
        description: 'e.g. "Blog: Frequenza Mix 01" or "Event: NYE 2026"',
        visible: true,
        editable: true,
      },
      list: { label: 'Title', searchable: true, sortable: true },
    },
    media_items: {
      edit: {
        label: 'Tracks',
        description: 'Tracks in this playlist.',
        visible: true,
        editable: true,
        mainField: 'title',
      },
      list: { label: 'Tracks', searchable: false, sortable: false },
    },
    autoplay: {
      edit: { visible: false, editable: false },
      list: { label: 'autoplay', searchable: false, sortable: false },
    },
    isExpanded: {
      edit: { visible: false, editable: false },
      list: { label: 'isExpanded', searchable: false, sortable: false },
    },
  },
  layouts: {
    list: ['title'],
    edit: [
      [{ name: 'title', size: 12 }],
      [{ name: 'media_items', size: 12 }],
    ],
  },
};

async function patchRelationMainField(strapi, uid, fieldName) {
  const store = strapi.store({
    type: 'plugin',
    name: 'content_manager',
  });

  const storeKey = `configuration_content_types::${uid}`;
  const existing = (await store.get({ key: storeKey })) || {};

  if (!existing.metadatas?.[fieldName]?.edit) {
    return;
  }

  existing.metadatas[fieldName].edit = {
    ...existing.metadatas[fieldName].edit,
    mainField: 'title',
  };

  await store.set({
    key: storeKey,
    value: existing,
  });
}

module.exports = async function configureMediaItemAdmin(strapi) {
  const store = strapi.store({
    type: 'plugin',
    name: 'content_manager',
  });

  await store.set({
    key: `configuration_content_types::${MEDIA_ITEM_UID}`,
    value: mediaItemContentManagerConfig,
  });

  await store.set({
    key: `configuration_content_types::${MEDIA_PLAYER_UID}`,
    value: mediaPlayerContentManagerConfig,
  });

  // Ensure relation pickers on blog posts / events show playlist titles.
  await patchRelationMainField(strapi, 'api::blog-post.blog-post', 'media_player');
  await patchRelationMainField(strapi, 'api::event.event', 'media_player');

  strapi.log.info(
    'Admin layouts: media items show title in relation pickers; create form is URL + playlist only.'
  );
};
