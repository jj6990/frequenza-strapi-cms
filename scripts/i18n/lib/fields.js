'use strict';

const CONTENT_TYPES = {
	category: {
		uid: 'api::category.category',
		kind: 'collection',
		draftAndPublish: false,
		localizedFields: ['name', 'slug', 'description'],
		sharedFields: [],
	},
	event: {
		uid: 'api::event.event',
		kind: 'collection',
		draftAndPublish: true,
		localizedFields: [
			'title',
			'slug',
			'eventDescription',
			'description',
			'location',
		],
		sharedFields: [],
	},
	'blog-post': {
		uid: 'api::blog-post.blog-post',
		kind: 'collection',
		draftAndPublish: true,
		localizedFields: ['title', 'slug', 'excerpt', 'description'],
		sharedFields: ['category'],
	},
	'media-item': {
		uid: 'api::media-item.media-item',
		kind: 'collection',
		draftAndPublish: true,
		localizedFields: ['title'],
		sharedFields: [],
	},
	'home-hero': {
		uid: 'api::home-hero.home-hero',
		kind: 'single',
		draftAndPublish: true,
		localizedFields: ['title', 'copy'],
		sharedFields: [],
	},
};

const SEED_ORDER = ['category', 'event', 'blog-post', 'media-item', 'home-hero'];

const API_ENDPOINTS = {
	category: 'categories',
	event: 'events',
	'blog-post': 'blog-posts',
	'media-item': 'media-items',
	'home-hero': 'home-hero',
};

function slugify(text) {
	if (!text || typeof text !== 'string') return '';
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 200);
}

function pickLocalizedFields(entry, localizedFields) {
	const fields = {};
	for (const key of localizedFields) {
		if (entry[key] !== undefined && entry[key] !== null) {
			fields[key] = entry[key];
		}
	}
	return fields;
}

function pickRelationDocumentId(relation) {
	if (!relation) return null;
	if (typeof relation === 'string') return relation;
	if (relation.documentId) return relation.documentId;
	if (relation.data?.documentId) return relation.data.documentId;
	return null;
}

function extractEntryForExport(entry, config) {
	const fields = pickLocalizedFields(entry, config.localizedFields);
	const relations = {};

	for (const key of config.sharedFields || []) {
		const relationId = pickRelationDocumentId(entry[key]);
		if (relationId) {
			relations[key] = relationId;
		}
	}

	return {
		documentId: entry.documentId,
		locale: entry.locale || null,
		publishedAt: entry.publishedAt || null,
		fields,
		relations: Object.keys(relations).length ? relations : undefined,
	};
}

function deepClone(value) {
	return JSON.parse(JSON.stringify(value));
}

module.exports = {
	CONTENT_TYPES,
	SEED_ORDER,
	API_ENDPOINTS,
	slugify,
	pickLocalizedFields,
	extractEntryForExport,
	deepClone,
};
