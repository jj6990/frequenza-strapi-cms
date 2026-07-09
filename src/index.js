'use strict';
const seedBootstrap = require('./bootstrap');
const configureMediaItemAdmin = require('./configure-media-item-admin');
const backfillMediaItemKeys = require('./backfill-media-item-keys');
const { notifyFrontendRevalidate } = require('./utils/notify-frontend-revalidate');

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    // Bust Next.js CMS caches after publish/update without relying on a
    // manually configured Admin webhook (those were easy to miss in prod).
    strapi.documents.use(async (context, next) => {
      const result = await next();
      // Fire-and-forget so a slow/unreachable frontend never blocks CMS writes.
      void notifyFrontendRevalidate({
        uid: context.uid,
        action: context.action,
        entry: result,
      });
      return result;
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    await configureMediaItemAdmin(strapi);
    await backfillMediaItemKeys(strapi);
    await seedBootstrap();
  },
};
