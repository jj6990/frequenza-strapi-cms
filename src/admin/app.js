const MEDIA_ITEM_UID = 'api::media-item.media-item';
const AUTO_FIELDS = new Set(['key', 'title', 'type']);

function indexLayoutFields(layoutRows) {
  const fieldsByName = new Map();

  for (const row of layoutRows ?? []) {
    for (const field of row) {
      fieldsByName.set(field.name, field);
    }
  }

  return fieldsByName;
}

function buildMediaItemLayout(layoutRows, isEditing) {
  const fieldsByName = indexLayoutFields(layoutRows);
  const nextRows = [];

  const url = fieldsByName.get('url');
  if (url) {
    nextRows.push([{ ...url, size: 12 }]);
  }

  const mediaPlayer = fieldsByName.get('media_player');
  if (mediaPlayer) {
    nextRows.push([{ ...mediaPlayer, size: 12 }]);
  }

  if (isEditing) {
    const detailRow = ['key', 'title', 'type']
      .filter(name => fieldsByName.has(name))
      .map(name => ({ ...fieldsByName.get(name), size: 4 }));

    if (detailRow.length > 0) {
      nextRows.push(detailRow);
    }
  }

  return nextRows;
}

function buildMediaItemMetadatas(metadatas) {
  const next = { ...metadatas };

  for (const name of AUTO_FIELDS) {
    if (!next[name]?.edit) continue;

    next[name] = {
      ...next[name],
      edit: {
        ...next[name].edit,
        editable: false,
        description: 'Filled automatically from the URL when you save.',
      },
    };
  }

  if (next.url?.edit) {
    next.url = {
      ...next.url,
      edit: {
        ...next.url.edit,
        description:
          'Paste a YouTube or SoundCloud link. Title, type, and key are filled on save.',
      },
    };
  }

  return next;
}

const config = {
  locales: [],
};

const bootstrap = app => {
  app.registerHook(
    'Admin/CM/pages/EditView/mutate-edit-view-layout',
    ({ layout, query }) => {
      if (layout?.uid !== MEDIA_ITEM_UID) {
        return { layout, query };
      }

      const isEditing = Boolean(query?.documentId);
      const nextLayout = buildMediaItemLayout(layout.layout, isEditing);

      return {
        layout: {
          ...layout,
          layout: nextLayout.length > 0 ? nextLayout : layout.layout,
          metadatas: buildMediaItemMetadatas(layout.metadatas ?? {}),
        },
        query,
      };
    }
  );
};

export default {
  config,
  bootstrap,
};
