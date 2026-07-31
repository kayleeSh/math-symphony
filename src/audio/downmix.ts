/** Downmixes every channel of a decoded AudioBuffer into a single mono Float32Array. */
export function downmixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length
  const mono = new Float32Array(length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) mono[i] += data[i] / buffer.numberOfChannels
  }
  return mono
}
