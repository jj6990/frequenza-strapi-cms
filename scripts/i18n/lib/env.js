'use strict';

const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
	if (!fs.existsSync(filePath)) return;
	const content = fs.readFileSync(filePath, 'utf8');
	const lines = content.split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (!process.env[key]) {
			process.env[key] = value;
		}
	}
}

function loadProjectEnv() {
	const root = path.resolve(__dirname, '../../..');
	loadEnvFile(path.join(root, '.env'));
	loadEnvFile(path.join(root, '.env.local'));
}

function getStrapiConfig() {
	loadProjectEnv();
	const strapiUrl =
		process.env.STRAPI_URL ||
		process.env.NEXT_PUBLIC_STRAPI_URL ||
		'http://localhost:1337';
	const token = process.env.STRAPI_API_TOKEN;

	if (!token) {
		console.warn(
			'⚠️  STRAPI_API_TOKEN not set — using public API (ensure find permissions are open)'
		);
	}

	return {
		strapiUrl: strapiUrl.replace(/\/$/, ''),
		token: token || null,
	};
}

module.exports = { loadProjectEnv, getStrapiConfig };
