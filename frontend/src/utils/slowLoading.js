import { onUnmounted, ref } from 'vue'

// Le backend gratuit dort quand personne ne l'utilise : après 3 s de chargement, on explique l'attente.
// start() au début du chargement, stop() à la fin (succès ou erreur).
export const SLOW_AFTER_MS = 3000
export const SLOW_MESSAGE = 'Le serveur se réveille, ça peut prendre jusqu’à une minute…'

export const useSlowLoading = () => {
  const slow = ref(false)
  let timer
  const stop = () => clearTimeout(timer)
  const start = () => {
    slow.value = false
    stop()
    timer = setTimeout(() => (slow.value = true), SLOW_AFTER_MS)
  }
  onUnmounted(stop)
  return { slow, start, stop }
}
