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

async function main() {
  const response = await fetch(feedUrl, {
    headers: { 'user-agent': 'The Bell website updater' }
  });
  if (!response.ok) throw new Error(`YouTube feed returned ${response.status}`);

  const feed = await response.text();
  const entry = feed.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) throw new Error('YouTube feed did not contain a video');

  const videoId = readTag(entry, 'yt:videoId');
  const title = readTag(entry, 'title');
  const publishedAt = readTag(entry, 'published');
  if (!videoId || !title) throw new Error('Latest YouTube entry was incomplete');

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
