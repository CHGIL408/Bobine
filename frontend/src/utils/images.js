import { reactive } from 'vue'

// Images qui n'ont pas pu se charger (affiche TMDB retirée, réseau coupé) : on affiche la place vide
// prévue pour « pas d'affiche » plutôt que l'icône d'image cassée du navigateur.
const broken = reactive(new Set())

// Une coupure réseau ne doit pas cacher les affiches pour toute la session : on réessaie au retour du réseau
if (typeof window !== 'undefined') window.addEventListener('online', () => broken.clear())

export const imageOk = (url) => Boolean(url) && !broken.has(url)
export const imageFailed = (url) => broken.add(url)
