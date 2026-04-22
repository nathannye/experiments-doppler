import { onClick } from '../utils/events'
import { getAudioBuffer } from '../utils/file'

class Doppler {
	public hasPlayed = false
	public distanceFromViewer = 0
	public ctx: AudioContext
	public btn: HTMLElement
	public buffer: AudioBuffer
	public source: AudioBufferSourceNode
	public gain: GainNode
	public panner: PannerNode
	public isInitialized = false

	constructor() {
		this.ctx = new AudioContext()
		this.btn = document.getElementById('play')

		this.init().then(() => {
			this.isInitialized = true
			onClick(this.btn, () => {
				this.toggle()
			})
		})
	}

	toggle() {
		if (this.ctx.state === 'running') {
			this.ctx.suspend()
			this.btn.textContent = 'Play'
		} else {
			if (!this.hasPlayed) {
				this.source.start()
				this.hasPlayed = true
			}

			this.ctx.resume()
			this.btn.textContent = 'Stop'
		}
	}

	async init() {
		this.buffer = await getAudioBuffer('/audio/jet-loop.mp3', this.ctx)

		this.gain = this.ctx.createGain()
		this.panner = this.ctx.createPanner()

		this.source = this.createSource()
		this.source.connect(this.panner)
		this.panner.connect(this.gain)
		this.gain.connect(this.ctx.destination)
	}

	createSource() {
		const source = this.ctx.createBufferSource()
		source.buffer = this.buffer
		source.loop = true
		return source
	}

	update(
		distance: number,
		x: number,
		y: number,
		z: number,
		rotationX: number,
		rotationY: number,
	) {
		if (!this.isInitialized) return

		this.distanceFromViewer = distance

		const safeDistance = Math.max(distance, 0.1)
		this.gain.gain.value = 1 / (safeDistance * safeDistance)
		this.panner.positionX.value = x
		this.panner.positionY.value = y
		this.panner.positionZ.value = z

		this.panner.orientationX.value = rotationX
		this.panner.orientationY.value = rotationY
		this.panner.orientationZ.value = 0
	}
}

export default new Doppler()
