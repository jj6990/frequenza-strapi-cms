'use strict';

const fs = require('fs-extra');
const path = require('path');
const {
	CONTENT_TYPES,
	API_ENDPOINTS,
	extractEntryForExport,
} = require('./lib/fields');
const { fetchAllEntries, fetchSingleType } = require('./lib/strapi-rest');

const OUTPUT_PATH = path.resolve(
	__dirname,
	'../../data/i18n/es-source.json'
);

async function exportContentType(key, config) {
	if (config.kind === 'single') {
		const entry = await fetchSingleType(API_ENDPOINTS[key]);
		if (!entry) return null;
		return extractEntryForExport(entry, config);
	}

	const entries = await fetchAllEntries(API_ENDPOINTS[key]);
	const byDocument = new Map();

	for (const entry of entries) {
		const existing = byDocument.get(entry.documentId);
		if (!existing) {
			byDocument.set(entry.documentId, entry);
			continue;
		}
		// Prefer Spanish-looking locale tag or first published
		if (entry.locale === 'es' || (!existing.publishedAt && entry.publishedAt)) {
			byDocument.set(entry.documentId, entry);
		}
	}

	return Array.from(byDocument.values()).map(entry =>
		extractEntryForExport(entry, config)
	);
}

async function main() {
	console.log('Exporting localized content from Strapi...');

	const contentTypes = {};
	let sourceLocale = null;

	for (const [key, config] of Object.entries(CONTENT_TYPES)) {
		console.log(`  → ${key}`);
		const exported = await exportContentType(key, config);
		if (config.kind === 'single') {
			contentTypes[key] = exported;
			if (exported?.locale) sourceLocale = exported.locale;
		} else {
			contentTypes[key] = exported || [];
			for (const item of contentTypes[key]) {
				if (item.locale && !sourceLocale) sourceLocale = item.locale;
			}
		}
	}

	const manifest = {
		exportedAt: new Date().toISOString(),
		sourceLocale: sourceLocale || 'en',
		contentTypes,
	};

	await fs.ensureDir(path.dirname(OUTPUT_PATH));
	await fs.writeJson(OUTPUT_PATH, manifest, { spaces: 2 });

	const counts = Object.entries(contentTypes).map(([key, value]) => {
		if (Array.isArray(value)) return `${key}: ${value.length}`;
		return `${key}: ${value ? 1 : 0}`;
	});

	console.log(`\n✅ Wrote ${OUTPUT_PATH}`);
	console.log(counts.join(', '));
}

main().catch(error => {
	console.error('❌ Export failed:', error.message);
	process.exit(1);
});
