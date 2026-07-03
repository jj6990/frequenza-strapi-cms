'use strict';

const fs = require('fs-extra');
const path = require('path');
const { CONTENT_TYPES, SEED_ORDER } = require('./lib/fields');

const SOURCE_PATH = path.resolve(__dirname, '../../data/i18n/es-source.json');
const EN_PATH = path.resolve(__dirname, '../../data/i18n/en-seed.json');

function buildUpdateData(item, config) {
	const data = { ...item.fields };

	for (const [relationKey, documentId] of Object.entries(item.relations || {})) {
		data[relationKey] = { connect: [documentId] };
	}

	return data;
}

async function seedLocale(strapi, key, config, items, locale, dryRun) {
	const uid = config.uid;
	const summary = { created: 0, updated: 0, skipped: 0, errors: 0 };

	const processItem = async item => {
		if (!item?.documentId) {
			summary.skipped += 1;
			return;
		}

		const data = buildUpdateData(item, config);
		const action = `update+publish ${key} ${item.documentId} locale=${locale}`;

		if (dryRun) {
			console.log(`  [dry-run] ${action}`);
			summary.updated += 1;
			return;
		}

		try {
			await strapi.documents(uid).update({
				documentId: item.documentId,
				locale,
				data,
			});
			if (config.draftAndPublish !== false) {
				await strapi.documents(uid).publish({
					documentId: item.documentId,
					locale,
				});
			}
			console.log(`  ✅ ${action}`);
			summary.updated += 1;
		} catch (error) {
			console.error(`  ❌ ${action}: ${error.message}`);
			summary.errors += 1;
		}
	};

	if (config.kind === 'single') {
		if (items) await processItem(items);
		else summary.skipped += 1;
	} else {
		for (const item of items || []) {
			await processItem(item);
		}
	}

	return summary;
}

async function main() {
	const dryRun = process.argv.includes('--dry-run');

	if (!fs.existsSync(SOURCE_PATH) || !fs.existsSync(EN_PATH)) {
		throw new Error('Missing es-source.json or en-seed.json. Run export + translate first.');
	}

	const source = await fs.readJson(SOURCE_PATH);
	const enSeed = await fs.readJson(EN_PATH);

	console.log(dryRun ? 'Dry-run seed (no writes)...' : 'Seeding localizations...');

	const { createStrapi, compileStrapi } = require('@strapi/strapi');
	const appContext = await compileStrapi();
	const strapi = await createStrapi(appContext).load();
	strapi.log.level = 'error';

	const totals = {};

	try {
		for (const key of SEED_ORDER) {
			const config = CONTENT_TYPES[key];
			console.log(`\n→ ${key} (es)`);
			totals[`${key}:es`] = await seedLocale(
				strapi,
				key,
				config,
				source.contentTypes[key],
				'es',
				dryRun
			);

			console.log(`→ ${key} (en)`);
			totals[`${key}:en`] = await seedLocale(
				strapi,
				key,
				config,
				enSeed.contentTypes[key],
				'en',
				dryRun
			);
		}
	} finally {
		await strapi.destroy();
	}

	console.log('\nSummary:');
	for (const [label, stats] of Object.entries(totals)) {
		console.log(
			`  ${label}: updated=${stats.updated} skipped=${stats.skipped} errors=${stats.errors}`
		);
	}

	const hasErrors = Object.values(totals).some(s => s.errors > 0);
	if (hasErrors) process.exit(1);
}

main().catch(error => {
	console.error('❌ Seed failed:', error);
	process.exit(1);
});
