// Re-exports store action — keeps component imports consistent
// Components call useVisionUpload() instead of reaching into the store directly.
import { useStore } from '@/store'

export function useVisionUpload() {
  return {
    analyzeArtwork: useStore((s) => s.analyzeArtwork),
    uploadStatus: useStore((s) => s.uploadStatus),
    uploadProgress: useStore((s) => s.uploadProgress),
    uploadError: useStore((s) => s.uploadError),
    visionResult: useStore((s) => s.visionResult),
  }
}
