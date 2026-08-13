// A short confirmation beep on checklist actions, reinforcing the visual
// state change with an audio cue for an agent who cannot read. Feature-
// detected: AudioContext isn't available in every environment (older
// browsers, jsdom in tests) -- silently no-op there instead of crashing.
export function playConfirmSound(): void {
  if (typeof window === 'undefined') return

  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextClass) return

  try {
    const ctx = new AudioContextClass()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.2)
    oscillator.onended = () => ctx.close()
  } catch {
    // Audio feedback is a nice-to-have -- never let it break the checklist flow.
  }
}
