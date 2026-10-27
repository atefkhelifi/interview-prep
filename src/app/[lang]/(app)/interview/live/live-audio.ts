// Browser audio for the Live API: microphone → 16 kHz 16-bit PCM chunks, and 24 kHz PCM playback.

// Runs on the audio thread. Averages input samples down to 16 kHz and posts 100 ms chunks of Int16 PCM.
const CAPTURE_WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.acc = 0; this.sum = 0; this.count = 0;
    this.buf = new Int16Array(1600); this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.sum += ch[i]; this.count++; this.acc++;
      if (this.acc >= this.ratio) {
        this.acc -= this.ratio;
        const s = Math.max(-1, Math.min(1, this.sum / this.count));
        this.sum = 0; this.count = 0;
        this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        if (this.n === this.buf.length) {
          this.port.postMessage(this.buf.buffer, [this.buf.buffer]);
          this.buf = new Int16Array(1600); this.n = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
`;

export function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(data: string) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

// One AudioContext for both directions; create it from a click so the browser allows sound.
export class LiveAudio {
  readonly ctx = new AudioContext();
  private stream?: MediaStream;
  private capture?: AudioWorkletNode;
  private nextStart = 0;
  private playing = new Set<AudioBufferSourceNode>();
  muted = false;

  async startMic(onChunk: (base64Pcm: string) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "text/javascript" }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    this.capture = new AudioWorkletNode(this.ctx, "pcm-capture");
    this.capture.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      if (!this.muted) onChunk(toBase64(e.data));
    };
    this.ctx.createMediaStreamSource(this.stream).connect(this.capture);
    this.capture.connect(this.ctx.destination); // outputs silence; keeps the node processing
  }

  // Queue a chunk of the model's voice right after the previous one.
  play(base64Pcm: string) {
    const pcm = fromBase64(base64Pcm);
    const buffer = this.ctx.createBuffer(1, pcm.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 0x8000;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    const at = Math.max(this.ctx.currentTime, this.nextStart);
    source.start(at);
    this.nextStart = at + buffer.duration;
    this.playing.add(source);
    source.onended = () => this.playing.delete(source);
  }

  get speaking() {
    return this.ctx.currentTime < this.nextStart;
  }

  // The candidate interrupted: drop whatever is still queued.
  stopPlayback() {
    for (const source of this.playing) source.stop();
    this.playing.clear();
    this.nextStart = 0;
  }

  async close() {
    this.stopPlayback();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.capture?.disconnect();
    if (this.ctx.state !== "closed") await this.ctx.close();
  }
}
