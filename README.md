# Alert Videos

Programmatic videos for Alert Global Tech, built with [Remotion](https://www.remotion.dev/).

## Commands

```bash
npm install        # install dependencies
npm run dev        # open Remotion Studio
npm run render     # render HelloWorld to out/hello-world.mp4
npm run typecheck  # TypeScript check
```

Compositions are registered in `src/Root.tsx`.

## Custom browser

If Remotion can't download Chrome Headless Shell (blocked network), point it at an existing Chromium:

```bash
REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell npm run render
```
