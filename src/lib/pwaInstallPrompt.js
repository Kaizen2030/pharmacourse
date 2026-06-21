let deferredInstallPrompt = null
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(deferredInstallPrompt)
    } catch (error) {
      console.error("PWA install listener error:", error)
    }
  })
}

function handleBeforeInstallPrompt(event) {
  event.preventDefault()
  deferredInstallPrompt = event
  notify()
}

function handleAppInstalled() {
  deferredInstallPrompt = null
  notify()
}

if (typeof window !== "undefined" && !window.__remedacarePwaInstallListenersAttached) {
  window.__remedacarePwaInstallListenersAttached = true
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
  window.addEventListener("appinstalled", handleAppInstalled)
}

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt
}

export function consumeDeferredInstallPrompt() {
  const prompt = deferredInstallPrompt
  deferredInstallPrompt = null
  notify()
  return prompt
}

export function subscribeToInstallPrompt(listener) {
  listeners.add(listener)
  listener(deferredInstallPrompt)

  return () => {
    listeners.delete(listener)
  }
}
