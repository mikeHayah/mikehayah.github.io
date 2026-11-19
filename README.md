# mikehayah.github.io

Personal research website of Michael Hanna, live at **https://mikehayah.github.io/**.

A static site (HTML, CSS and plain JavaScript, no build step) published by GitHub Pages from the `main` branch.

| Path | Contents |
|---|---|
| `index.html`, `style.css`, `script.js` | The site |
| `privacy.html` | Privacy notice |
| `media/` | Project animations, the publication figure and the link-preview card (`og-card.png`) |
| `fonts/` | Self-hosted Instrument Serif, Inter and JetBrains Mono, with their SIL Open Font License files |
| `*.pdf` | Reference letters shown in the site's document viewer |

To preview locally, serve the folder over HTTP (fonts don't load from `file://`):

```sh
python3 -m http.server 8000
```

then open http://localhost:8000.
