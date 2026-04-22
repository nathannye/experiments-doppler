import { onClick } from '../utils/events'
import { getAudioBuffer } from '../utils/file'

class Doppler {
	public hasPlayed = false
	public distanceFromViewer = 0
	public ctx: AudioContext
	public btn: HTMLElement
	public source: AudioBufferSourceNode
	public gain: GainNode

	constructor() {
		this.ctx = new AudioContext()
		this.btn = document.getElementById('play')

		this.distanceFromViewer = 0

		this.init().then(() => {
			onClick(this.btn, () => {
				this.toggle()
			})
		})
	}

	toggle() {
		if (this.ctx.state === 'running') {
			this.ctx.suspend()
			this.source.stop()
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
		this.source = this.ctx.createBufferSource()
		this.source.buffer = await getAudioBuffer('/audio/jet-loop.mp3', this.ctx)

		this.source.loop = true

		this.gain = this.ctx.createGain()

		this.source.connect(this.gain)
		this.gain.connect(this.ctx.destination)
	}

	update(distance: number) {
		console.log(distance)
		this.distanceFromViewer = distance

		this.gain.gain.value = 1 / (distance * distance)
	}
}

export default new Doppler()
