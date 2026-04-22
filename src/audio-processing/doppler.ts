import { Vector3 } from 'three'
import camera from '../gl/camera'
import { onClick } from '../utils/events'
import { getAudioBuffer } from '../utils/file'
import { clamp, lerp } from '../utils/math'

class Doppler {
	public hasPlayed = false
	public distanceFromViewer = 0
	public ctx: AudioContext
	public btn: HTMLElement
	public buffer: AudioBuffer
	public source: AudioBufferSourceNode
	public gain: GainNode
	public panner: PannerNode
	public stereoPanner: StereoPannerNode
	public isInitialized = false
	public lerpValue = 0.1
	public listenerPos: Vector3

	constructor() {
		this.ctx = new AudioContext()
		this.btn = document.getElementById('play')
		this.listenerPos = camera.position.clone()

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
		this.stereoPanner = this.ctx.createStereoPanner()

		this.source = this.createSource()
		this.source.connect(this.stereoPanner)
		this.stereoPanner.connect(this.gain)
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
		time: number,
	) {
		if (!this.isInitialized) return

		this.distanceFromViewer = distance

		const safeDistance = Math.max(distance, 0.1)
		this.gain.gain.value = 1 / (safeDistance * safeDistance)

		const sourcePos = new Vector3(x, y, z)
		const dir = sourcePos.clone().sub(this.listenerPos).normalize()
		const right = sourcePos.clone().applyQuaternion(camera.quaternion)
		const pan = clamp(-1, 1, right.dot(dir))

		const forward = sourcePos.clone().applyQuaternion(camera.quaternion)
		const frontness = Math.abs(dir.dot(forward)) // 0 = side, 1 = directly front/back

		const dampenedPan = clamp(-1, 1, pan * (1 - frontness))

		this.stereoPanner.pan.value = lerp(
			dampenedPan,
			this.stereoPanner.pan.value,
			this.lerpValue,
		)
	}
}

export default new Doppler()
