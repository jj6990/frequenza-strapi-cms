'use strict';

const { getStrapiConfig } = require('./env');

async function strapiFetch(path, options = {}) {
	const { strapiUrl, token } = getStrapiConfig();
	const url = `${strapiUrl}/api${path.startsWith('/') ? path : `/${path}`}`;
	const headers = {
		'Content-Type': 'application/json',
		...(options.headers || {}),
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(url, {
		...options,
		headers,
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Strapi ${response.status} ${url}: ${body.slice(0, 300)}`);
	}

	return response.json();
}

async function fetchAllEntries(endpoint) {
	const pageSize = 100;
	let page = 1;
	const all = [];

	while (true) {
		const params = new URLSearchParams({
			'pagination[page]': String(page),
			'pagination[pageSize]': String(pageSize),
			populate: '*',
		});
		const json = await strapiFetch(`/${endpoint}?${params.toString()}`);
		const batch = json.data || [];
		all.push(...batch);

		const pageCount = json.meta?.pagination?.pageCount || 1;
		if (page >= pageCount) break;
		page += 1;
	}

	return all;
}

async function fetchSingleType(endpoint) {
	const params = new URLSearchParams({
		populate: '*',
	});
	const json = await strapiFetch(`/${endpoint}?${params.toString()}`);
	return json.data || null;
}

module.exports = { strapiFetch, fetchAllEntries, fetchSingleType };
