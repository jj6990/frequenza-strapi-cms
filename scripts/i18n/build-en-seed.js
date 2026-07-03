'use strict';

const fs = require('fs-extra');
const path = require('path');
const { CONTENT_TYPES } = require('./lib/fields');

const SOURCE_PATH = path.resolve(__dirname, '../../data/i18n/es-source.json');
const EN_PATH = path.resolve(__dirname, '../../data/i18n/en-seed.json');

function collectDocumentIds(value, key) {
	const config = CONTENT_TYPES[key];
	if (!config) return [];

	if (config.kind === 'single') {
		return value?.documentId ? [value.documentId] : [];
	}

	return (value || []).map(item => item.documentId).filter(Boolean);
}

function validateManifest(manifest, label) {
	if (!manifest?.contentTypes) {
		throw new Error(`${label}: missing contentTypes`);
	}

	for (const key of Object.keys(CONTENT_TYPES)) {
		if (!(key in manifest.contentTypes)) {
			throw new Error(`${label}: missing content type "${key}"`);
		}
	}
}

function compareManifests(source, enSeed) {
	const errors = [];

	for (const key of Object.keys(CONTENT_TYPES)) {
		const sourceIds = new Set(collectDocumentIds(source.contentTypes[key], key));
		const enIds = new Set(collectDocumentIds(enSeed.contentTypes[key], key));

		for (const id of sourceIds) {
			if (!enIds.has(id)) {
				errors.push(`${key}: missing en entry for documentId ${id}`);
			}
		}

		for (const id of enIds) {
			if (!sourceIds.has(id)) {
				errors.push(`${key}: extra en entry for documentId ${id}`);
			}
		}

		const config = CONTENT_TYPES[key];
		const sourceItems =
			config.kind === 'single'
				? source.contentTypes[key]
					? [source.contentTypes[key]]
					: []
				: source.contentTypes[key] || [];
		const enItems =
			config.kind === 'single'
				? enSeed.contentTypes[key]
					? [enSeed.contentTypes[key]]
					: []
				: enSeed.contentTypes[key] || [];

		const enById = new Map(enItems.map(item => [item.documentId, item]));

		for (const sourceItem of sourceItems) {
			const enItem = enById.get(sourceItem.documentId);
			if (!enItem) continue;

			for (const field of config.localizedFields) {
				if (
					sourceItem.fields?.[field] !== undefined &&
					enItem.fields?.[field] === undefined
				) {
					errors.push(
						`${key}/${sourceItem.documentId}: missing en field "${field}"`
					);
				}
			}
		}
	}

	return errors;
}

function scaffoldFromSource(source) {
	return {
		exportedAt: source.exportedAt,
		targetLocale: 'en',
		sourceLocale: source.sourceLocale,
		contentTypes: Object.fromEntries(
			Object.entries(source.contentTypes).map(([key, value]) => {
				const config = CONTENT_TYPES[key];
				if (config.kind === 'single') {
					if (!value) return [key, null];
					return [
						key,
						{
							documentId: value.documentId,
							fields: Object.fromEntries(
								config.localizedFields.map(field => [field, null])
							),
							relations: value.relations,
						},
					];
				}

				return [
					key,
					(value || []).map(item => ({
						documentId: item.documentId,
						fields: Object.fromEntries(
							config.localizedFields.map(field => [field, null])
						),
						relations: item.relations,
					})),
				];
			})
		),
	};
}

async function main() {
	const args = process.argv.slice(2);
	const scaffold = args.includes('--scaffold');
	const check = args.includes('--check') || (!scaffold && args.length === 0);

	if (!fs.existsSync(SOURCE_PATH)) {
		throw new Error(`Missing ${SOURCE_PATH}. Run yarn i18n:export first.`);
	}

	const source = await fs.readJson(SOURCE_PATH);
	validateManifest(source, 'es-source.json');

	if (scaffold) {
		const scaffolded = scaffoldFromSource(source);
		await fs.writeJson(EN_PATH, scaffolded, { spaces: 2 });
		console.log(`✅ Scaffolded ${EN_PATH} — fill in English translations`);
		return;
	}

	if (!check) {
		console.log('Usage: build-en-seed.js [--scaffold | --check]');
		process.exit(1);
	}

	if (!fs.existsSync(EN_PATH)) {
		throw new Error(`Missing ${EN_PATH}. Create it from es-source.json translations.`);
	}

	const enSeed = await fs.readJson(EN_PATH);
	validateManifest(enSeed, 'en-seed.json');

	const errors = compareManifests(source, enSeed);
	if (errors.length) {
		console.error('❌ Validation failed:\n' + errors.map(e => `  - ${e}`).join('\n'));
		process.exit(1);
	}

	console.log('✅ en-seed.json matches es-source.json structure');
}

main().catch(error => {
	console.error('❌', error.message);
	process.exit(1);
});
