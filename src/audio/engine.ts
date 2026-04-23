import { Subscribable } from '../subscribers/subscribable'
import type { AudioEngineOptions, AudioEngineTick, ListenerProvider } from './types'

export class AudioEngine extends Subscribable<AudioEngineTick> {
	public ctx: AudioContext
	public masterGain: GainNode
	public reverbInput: GainNode
	public reverbOutput: GainNode
	public convolver: ConvolverNode
	public listenerProvider: ListenerProvider

	private prevTimeMs = 0

	constructor(options: AudioEngineOptions) {
		super()
		this.ctx = new AudioContext()
		this.listenerProvider = options.listenerProvider

		this.masterGain = this.ctx.createGain()
		this.masterGain.gain.value = options.masterGain ?? 1

		this.reverbInput = this.ctx.createGain()
		this.reverbOutput = this.ctx.createGain()
		this.reverbOutput.gain.value = options.defaultReverbWet ?? 0.25

		this.convolver = this.ctx.createConvolver()
		this.convolver.buffer = this.createImpulse(
			options.defaultReverbLengthSec ?? 1.5,
			options.defaultReverbDecay ?? 2,
		)

		this.reverbInput.connect(this.convolver)
		this.convolver.connect(this.reverbOutput)
		this.reverbOutput.connect(this.masterGain)
		this.masterGain.connect(this.ctx.destination)
	}

	setListenerProvider(listenerProvider: ListenerProvider): void {
		this.listenerProvider = listenerProvider
	}

	async resume(): Promise<void> {
		if (this.ctx.state !== 'running') {
			await this.ctx.resume()
		}
	}

	async suspend(): Promise<void> {
		if (this.ctx.state === 'running') {
			await this.ctx.suspend()
		}
	}

	update(timeMs: number): void {
		const deltaMs = this.prevTimeMs > 0 ? timeMs - this.prevTimeMs : 0
		const deltaSec = deltaMs / 1000
		this.prevTimeMs = timeMs

		const tick: AudioEngineTick = {
			timeMs,
			deltaMs,
			deltaSec,
			audioTime: this.ctx.currentTime,
			listener: this.listenerProvider(),
		}

		this.notify(tick)
	}

	private createImpulse(lengthSec: number, decay: number): AudioBuffer {
		const sampleRate = this.ctx.sampleRate
		const length = Math.max(1, Math.floor(sampleRate * lengthSec))
		const impulse = this.ctx.createBuffer(2, length, sampleRate)

		for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
			const data = impulse.getChannelData(channel)
			for (let i = 0; i < length; i += 1) {
				const t = i / length
				const attenuation = Math.pow(1 - t, decay)
				data[i] = (Math.random() * 2 - 1) * attenuation
			}
		}

		return impulse
	}
}
