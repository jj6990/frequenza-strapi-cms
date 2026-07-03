'use strict';

/**
 * One-time generator: reads es-source.json, translates localized fields to English,
 * writes en-seed.json. Run manually after export when content changes.
 *
 * Uses google-translate-api-x (dev dependency during pipeline setup).
 */

const fs = require('fs-extra');
const path = require('path');
const translate = require('google-translate-api-x');
const { CONTENT_TYPES, slugify, deepClone } = require('./lib/fields');

const SOURCE_PATH = path.resolve(__dirname, '../../data/i18n/es-source.json');
const EN_PATH = path.resolve(__dirname, '../../data/i18n/en-seed.json');

const SKIP_TRANSLATE = /^(https?:\/\/|@|TBA$|tba$)/i;
const FORCE_TRANSLATE_FIELDS = new Set(['title', 'name', 'excerpt', 'location']);

const cache = new Map();
let requestCount = 0;

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateText(text, { html = false, force = false } = {}) {
	if (!text || typeof text !== 'string') return text;
	const trimmed = text.trim();
	if (!trimmed) return text;
	if (SKIP_TRANSLATE.test(trimmed)) return text;
	if (!force && !/[áéíóúñ¿¡]/i.test(trimmed) && /^[A-Za-z0-9\s&.,'!?()\-–—:+@#%*[\]{}🎃👻💃🕺✨❌🗓📍🎧]+$/u.test(trimmed)) {
		return text;
	}

	const cacheKey = `${html ? 'html:' : ''}${text}`;
	if (cache.has(cacheKey)) return cache.get(cacheKey);

	requestCount += 1;
	if (requestCount % 20 === 0) {
		await sleep(500);
	}

	try {
		const result = await translate(text, {
			from: 'es',
			to: 'en',
			autoCorrect: false,
			...(html ? { forceBatch: false } : {}),
		});
		const translated = result.text || text;
		cache.set(cacheKey, translated);
		return translated;
	} catch {
		cache.set(cacheKey, text);
		return text;
	}
}

async function translateBlocks(blocks) {
	if (!Array.isArray(blocks)) return blocks;
	const cloned = deepClone(blocks);

	async function walk(node) {
		if (!node || typeof node !== 'object') return;
		if (typeof node.text === 'string') {
			node.text = await translateText(node.text);
		}
		if (Array.isArray(node.children)) {
			for (const child of node.children) {
				await walk(child);
			}
		}
	}

	for (const block of cloned) {
		await walk(block);
	}
	return cloned;
}

async function translateHtml(html) {
	if (!html || typeof html !== 'string') return html;
	return translateText(html, { html: true });
}

async function translateFields(fields, localizedFields) {
	const out = {};
	for (const key of localizedFields) {
		const value = fields[key];
		if (value === undefined || value === null) continue;

		if (key === 'slug') {
			out[key] = value;
			continue;
		}

		if (key === 'description' && Array.isArray(value)) {
			out[key] = await translateBlocks(value);
		} else if (
			(key === 'description' || key === 'eventDescription') &&
			typeof value === 'string'
		) {
			out[key] = await translateHtml(value);
		} else if (key === 'copy' && Array.isArray(value)) {
			out[key] = await translateBlocks(value);
		} else if (typeof value === 'string') {
			out[key] = await translateText(value, {
				force: FORCE_TRANSLATE_FIELDS.has(key),
			});
		} else {
			out[key] = value;
		}
	}

	if (out.title && localizedFields.includes('slug')) {
		out.slug = slugify(out.title);
	} else if (out.name && localizedFields.includes('slug')) {
		out.slug = slugify(out.name);
	}

	return out;
}

async function translateEntry(item, config) {
	return {
		documentId: item.documentId,
		fields: await translateFields(item.fields, config.localizedFields),
		relations: item.relations,
	};
}

async function main() {
	if (!fs.existsSync(SOURCE_PATH)) {
		throw new Error(`Missing ${SOURCE_PATH}`);
	}

	const source = await fs.readJson(SOURCE_PATH);
	const contentTypes = {};

	for (const [key, config] of Object.entries(CONTENT_TYPES)) {
		console.log(`Translating ${key}...`);
		const value = source.contentTypes[key];

		if (config.kind === 'single') {
			contentTypes[key] = value
				? await translateEntry(value, config)
				: null;
		} else {
			contentTypes[key] = [];
			for (const item of value || []) {
				contentTypes[key].push(await translateEntry(item, config));
			}
		}
	}

	const enSeed = {
		exportedAt: source.exportedAt,
		targetLocale: 'en',
		sourceLocale: source.sourceLocale,
		translatedAt: new Date().toISOString(),
		contentTypes,
	};

	await fs.writeJson(EN_PATH, enSeed, { spaces: 2 });
	console.log(`✅ Wrote ${EN_PATH} (${requestCount} translation requests)`);
}

main().catch(error => {
	console.error('❌', error);
	process.exit(1);
});
