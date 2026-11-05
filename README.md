# Dla Ciebie

A Polish bridesmaid invitation adapted from [event-rsvp](https://github.com/ayogun/event-rsvp). It keeps the original static build, folding-letter effect and music controls, without the RSVP form or backend.

## Preview

With Node.js 18 or newer:

```sh
npm run preview
```

Open `http://localhost:8080`. Each click, sideways swipe, or left/right arrow key unfolds another connected panel. Earlier messages stay open and can be revisited by scrolling or using the previous button; the last screen can be read again from the beginning. All messages are also available without JavaScript.

## Edit and build

Edit the cover and the `messages` array in `config.js`. The final entry can include `detail` and `final: true`. The music file is `music.mp3` in the project root; replace it or set `musicFile` to an empty string to disable music.

```sh
npm run build
```

The build copies the site, artwork, and music into `docs/`. To serve it with GitHub Pages, choose **Deploy from a branch**, select the main branch and `/docs` in the repository's Pages settings. On GitHub Free, Pages requires a public repository; making the repository public also makes its files and music public.

The site tries to play the supplied music immediately. Browsers may block audible autoplay until the visitor first clicks, taps, or presses a key; playback then starts automatically. The music button can pause or resume it.

## Artwork

The floral decorations are adapted from public-domain (CC0) botanical illustrations by Henry Joseph Redouté, courtesy of the Cleveland Museum of Art: [Agatha Rose](https://commons.wikimedia.org/wiki/File:Henry_Joseph_Redout%C3%A9_-_Agatha_Rose_(Rosa_Gallica_Agatha)_-_1959.20_-_Cleveland_Museum_of_Art.tif) and [Brier Bush Rose](https://commons.wikimedia.org/wiki/File:Henry_Joseph_Redout%C3%A9_-_Brier_Bush_Rose_or_Dog_Rose_(Rosa_Sepium_Rosea)_-_1959.18_-_Cleveland_Museum_of_Art.tif).
