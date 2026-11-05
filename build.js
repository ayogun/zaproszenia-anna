const fs = require('fs');
const path = require('path');
const config = { ...require('./config') };

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));

const siteUrl = (config.siteUrl || '').replace(/\/+$/, '');
const absolute = (url) => (/^https?:\/\//.test(url) ? url : siteUrl ? `${siteUrl}/${url.replace(/^\/+/, '')}` : '');
const ogImage = config.ogImage ? absolute(config.ogImage) : '';

const vars = {
  ...config,
  messagesJson: JSON.stringify(config.messages),
  storyFallbackHtml: config.messages.map(({ text, detail }) =>
    `<li><p>${esc(text)}</p>${detail ? `<p><em>${esc(detail)}</em> ❤</p>` : ''}</li>`
  ).join(''),
  ogUrlTag: siteUrl ? `<meta property="og:url" content="${esc(siteUrl + '/')}">` : '',
  ogImageTag: ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : '',
};

const template = fs.readFileSync(path.join(__dirname, 'views', 'invitation.html'), 'utf8');
const html = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
  if (!(key in vars)) throw new Error(`Unknown placeholder ${match} in template`);
  return /(Html|Tag)$/.test(key) ? vars[key] : esc(vars[key]);
});

const out = path.join(__dirname, 'docs');
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(__dirname, 'public'), out, { recursive: true });
if (config.musicFile) {
  const musicSource = path.join(__dirname, config.musicFile);
  const musicDestination = path.join(out, config.musicFile);
  fs.mkdirSync(path.dirname(musicDestination), { recursive: true });
  fs.copyFileSync(musicSource, musicDestination);
}
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Built docs/index.html');
