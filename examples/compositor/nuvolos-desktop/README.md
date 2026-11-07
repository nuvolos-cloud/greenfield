# nuvolos-desktop

Bare Nuvolos Wayland sidecar web client. Fork of
`examples/compositor/experimental-fullscreen` with the `compositor-shell`
chrome (`AppBar`, launcher inputs, window list, `window.alert` notify)
removed:

- single fullscreen `<canvas id="output">`, `mode: 'experimental-fullscreen'`
  (`AlwaysFullscreenDesktopSurface` — desktop rendered as-is),
- inline `#notify` toast instead of `alert()`,
- device-pixel canvas backing (`devicePixelRatio`) on top of
  `Scene.ensureResolution`, re-synced on zoom/monitor change,
- same-origin launch URL `/desktop` by default
  (`?app=/path` or `?appUrl=` override for dev).

## Build

```bash
yarn workspace @gfld/example-nuvolos-desktop build
# → examples/compositor/nuvolos-desktop/dist/
```

## License

AGPL-3.0-or-later, same as Greenfield.
