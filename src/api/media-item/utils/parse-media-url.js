'use strict';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

const SOUNDCLOUD_HOSTS = new Set([
  'soundcloud.com',
  'www.soundcloud.com',
  'm.soundcloud.com',
]);

function parseMediaUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('A valid YouTube or SoundCloud URL is required.');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL format. Paste a full YouTube or SoundCloud link.');
  }

  const host = parsed.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    let videoId = null;

    if (host.includes('youtu.be')) {
      videoId = parsed.pathname.replace(/^\//, '').split('/')[0] || null;
    } else {
      videoId = parsed.searchParams.get('v');
      if (!videoId && parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2] || null;
      }
      if (!videoId && parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] || null;
      }
    }

    if (!videoId) {
      throw new Error('Could not extract a YouTube video ID from this URL.');
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return {
      type: 'youtube',
      key: `youtube:${videoId}`,
      url: canonicalUrl,
      fallbackTitle: `YouTube · ${videoId}`,
    };
  }

  if (SOUNDCLOUD_HOSTS.has(host)) {
    const path = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    if (!path || path === '/') {
      throw new Error('Could not extract a SoundCloud track path from this URL.');
    }

    const canonicalUrl = `https://soundcloud.com${path}`;

    return {
      type: 'soundcloud',
      key: `soundcloud:${path}`,
      url: canonicalUrl,
      fallbackTitle: `SoundCloud · ${path}`,
    };
  }

  throw new Error('Only YouTube and SoundCloud URLs are supported.');
}

async function fetchOEmbedTitle(url, type) {
  const oembedBase =
    type === 'youtube'
      ? 'https://www.youtube.com/oembed'
      : 'https://soundcloud.com/oembed';

  const endpoint = `${oembedBase}?url=${encodeURIComponent(url)}&format=json`;

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
    return title || null;
  } catch {
    return null;
  }
}

module.exports = {
  parseMediaUrl,
  fetchOEmbedTitle,
};
