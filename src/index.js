'use strict';
const seedBootstrap = require('./bootstrap');
const configureMediaItemAdmin = require('./configure-media-item-admin');
const backfillMediaItemKeys = require('./backfill-media-item-keys');

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

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
