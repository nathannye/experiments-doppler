import { onClick } from '../utils/events'
import { getAudioBuffer } from '../utils/file'

export class Doppler {
	constructor() {
		this.hasPlayed = false
		this.ctx = new AudioContext()
		this.btn = document.getElementById('play')

		this.init()
		onClick(this.btn, () => {
			this.toggle()
		})
	}

	toggle() {
		console.log(this.source)
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
}
