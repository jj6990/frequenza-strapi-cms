'use strict';

const REVALIDATE_ACTIONS = new Set([
	'create',
	'update',
	'delete',
	'publish',
	'unpublish',
]);

const REVALIDATE_UIDS = new Set([
	'api::blog-post.blog-post',
	'api::category.category',
	'api::event.event',
	'api::home-hero.home-hero',
	'api::media-item.media-item',
	'api::media-player.media-player',
]);

function modelFromUid(uid) {
	const match = String(uid || '').match(/^api::([^.]+)\./);
	return match?.[1] ?? null;
}

function pickEntry(result) {
	if (!result) return null;
	if (Array.isArray(result)) {
		return result.find(item => item && typeof item === 'object') ?? null;
	}
	if (typeof result === 'object') return result;
	return null;
}

/**
 * Notify the Next.js app to bust CMS caches after content changes.
 * Configure on Strapi (Cloud/local):
 *   FRONTEND_REVALIDATE_URL=https://frequenzamusic.com/api/revalidate
 *   REVALIDATE_SECRET=<same value as Vercel REVALIDATE_SECRET>
 */
async function notifyFrontendRevalidate({ uid, action, entry }) {
	if (!REVALIDATE_ACTIONS.has(action) || !REVALIDATE_UIDS.has(uid)) {
		return;
	}

	const url = process.env.FRONTEND_REVALIDATE_URL;
	const secret = process.env.REVALIDATE_SECRET;

	if (!url || !secret) {
		strapi.log.debug(
			'[revalidate] skipped — FRONTEND_REVALIDATE_URL or REVALIDATE_SECRET unset'
		);
		return;
	}

	const model = modelFromUid(uid);
	if (!model) return;

	const resolvedEntry = pickEntry(entry);

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-revalidate-secret': secret,
			},
			body: JSON.stringify({
				model,
				uid,
				entry: resolvedEntry
					? {
							slug: resolvedEntry.slug ?? null,
							documentId: resolvedEntry.documentId ?? null,
						}
					: undefined,
			}),
		});

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			strapi.log.warn(
				`[revalidate] ${model}/${action} failed: ${response.status} ${text}`
			);
			return;
		}

		strapi.log.info(`[revalidate] ${model}/${action} ok`);
	} catch (error) {
		strapi.log.warn(
			`[revalidate] ${model}/${action} error: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
	}
}

module.exports = {
	REVALIDATE_ACTIONS,
	REVALIDATE_UIDS,
	notifyFrontendRevalidate,
};
