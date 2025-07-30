'use strict';

/**
 * media-player service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::media-player.media-player');
