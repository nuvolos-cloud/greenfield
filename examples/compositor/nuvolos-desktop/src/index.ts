import { createAppLauncher, createCompositorSession, initWasm } from '@gfld/compositor'

const wasmLibs = initWasm()

function notifyEl(): HTMLElement {
  const el = document.getElementById('notify')
  if (el === null) {
    throw new Error('BUG. No element with id "notify"')
  }
  return el
}

let notifyTimer: number | undefined
function notify(message: string): void {
  const el = notifyEl()
  el.textContent = message
  el.style.display = 'block'
  clearTimeout(notifyTimer)
  notifyTimer = window.setTimeout(() => {
    el.style.display = 'none'
  }, 8000)
  console.error(`[nuvolos-desktop] ${message}`)
}

// Apply device-pixel backing store so HiDPI output is sharp.
// Greenfield's Scene.ensureResolution only syncs CSS pixels (upstream TODO);
// we additionally scale the drawing buffer by devicePixelRatio and keep it
// in sync on zoom/monitor changes.
function applyHiDPI(canvas: HTMLCanvasElement): void {
  const sync = () => {
    const dpr = window.devicePixelRatio || 1
    const w = Math.round(canvas.clientWidth * dpr)
    const h = Math.round(canvas.clientHeight * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
  }
  sync()
  // zoom / monitor-DPR changes
  const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
  const onChange = () => {
    sync()
    // re-arm: the query is for the old DPR value
    mq.removeEventListener('change', onChange)
    applyHiDPI(canvas)
  }
  mq.addEventListener('change', onChange)
  new ResizeObserver(sync).observe(canvas)
}

// Resolve the proxy launch URL:
// - same-origin relative `/desktop` by default (nginx proxies to :8081),
// - override via `?app=/path` or `?appUrl=<absolute>` for dev.
function resolveAppURL(): URL {
  const params = new URLSearchParams(window.location.search)
  const appUrl = params.get('appUrl')
  if (appUrl) {
    return new URL(appUrl)
  }
  const path = params.get('app') ?? '/desktop'
  return new URL(path, window.location.href)
}

async function main() {
  await wasmLibs

  // Fullscreen mode: single surface fills the output, no floating chrome.
  const session = await createCompositorSession({ mode: 'experimental-fullscreen' })
  session.userShell.events.notify = (_variant: string, message: string) => notify(message)

  const canvas = document.getElementById('output') as HTMLCanvasElement
  applyHiDPI(canvas)
  session.userShell.actions.initScene(() => ({ canvas, id: canvas.id }))
  session.globals.register()

  const appURL = resolveAppURL()
  const appContext = createAppLauncher(session, 'remote').launch(appURL, (childAppContext) => {
    childAppContext.onStateChange = (state) => {
      console.log(`Child app is ${state}`)
    }
  })

  appContext.onStateChange = (state) => {
    console.log(`App state is ${state}`)
    if (state === 'error' || state === 'terminated') {
      notify(`Desktop session ${state}. Reload the page to reconnect.`)
    }
  }
  appContext.onNameChanged = (name) => {
    window.document.title = name ? `${name} — Nuvolos Desktop` : 'Nuvolos Desktop'
  }
  appContext.onError = (error: Error) => {
    notify(`Failed to launch desktop: ${error.message}`)
  }
  window.document.title = 'Nuvolos Desktop'
  canvas.focus()
}

window.onload = () => {
  main()
}
