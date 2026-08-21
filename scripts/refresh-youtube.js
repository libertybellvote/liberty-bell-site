const fs = require('fs');
const path = require('path');

const channelId = 'UCRVurb7JUXcrAUnvyzcSSRA';
const channelUrl = 'https://www.youtube.com/@TheBellVote';
const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
const dataPath = path.join(__dirname, '..', 'site-data.json');

function decodeXml(value = '') {
  return value
    .replace(/^<!\[CDATA\[|\]\]>$/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function readTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`));
  return match ? decodeXml(match[1].trim()) : '';
}

function feedEntries(feed) {
  return [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(match => {
    const xml = match[1];
    const link = xml.match(/<link\s+rel="alternate"\s+href="([^"]+)"\s*\/>/i);
    return {
      videoId: readTag(xml, 'yt:videoId'),
      title: readTag(xml, 'title'),
      publishedAt: readTag(xml, 'published'),
      url: link ? decodeXml(link[1]) : ''
    };
  }).filter(entry => entry.videoId && entry.title);
}

function latestFullLengthVideo(feed) {
  const entries = feedEntries(feed);
  // YouTube's own RSS feed identifies Shorts with a /shorts/ URL and standard
  // uploads with a /watch URL. That is more reliable than guessing by title or
  // duration, especially now that Shorts can run for up to three minutes.
  const standardUpload = entries.find(entry => /youtube\.com\/watch\?/i.test(entry.url));
  if (standardUpload) return standardUpload;
  throw new Error('YouTube feed did not contain a full-length upload');
}

async function main() {
  const response = await fetch(feedUrl, {
    headers: { 'user-agent': 'The Bell website updater' }
  });
  if (!response.ok) throw new Error(`YouTube feed returned ${response.status}`);

  const feed = await response.text();
  const { videoId, title, publishedAt } = latestFullLengthVideo(feed);

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const previousId = data.latestVideo?.videoId;
  data.latestVideo = {
    videoId,
    title,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
    publishedAt,
    channelName: 'The Bell',
    channelUrl
  };
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);

  console.log(previousId === videoId
    ? `Latest YouTube video remains ${videoId}`
    : `Latest YouTube video updated to ${videoId}`);
}

main().catch(error => {
  console.error(`YouTube refresh failed: ${error.message}`);
  process.exitCode = 1;
});
