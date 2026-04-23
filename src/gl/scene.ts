import { Quaternion, Scene as ThreeScene, Vector3 } from 'three'
import { AudioEngine } from '../audio/engine'
import { SpatialSource } from '../audio/source'
import { onClick } from '../utils/events'
import camera from './camera'
import { TrackedObject } from './tracked-object'

class Scene extends ThreeScene {
	trackedObject!: TrackedObject
	audioEngine!: AudioEngine
	jetSource!: SpatialSource
	listenerVelocity = new Vector3()
	prevListenerPos = new Vector3()
	prevTimeSec = 0
	listenerForward = new Vector3(0, 0, -1)
	listenerRight = new Vector3(1, 0, 0)
	listenerQuat = new Quaternion()

	constructor() {
		super()
		this.init()
	}

	init() {
		this.trackedObject = new TrackedObject()
		this.add(this.trackedObject)

		this.audioEngine = new AudioEngine({
			listenerProvider: () => this.getListenerState(),
			defaultReverbWet: 0.2,
		})

		this.jetSource = new SpatialSource(this.audioEngine, {
			loop: true,
			baseGain: 1,
			distance: {
				enabled: true,
				model: 'inverse',
				minDistance: 0.8,
				maxDistance: 50,
			},
			pan: {
				enabled: true,
				mode: 'hrtf3d',
				smoothing: 0.32,
			},
			doppler: {
				enabled: true,
				depth: 1.7,
				smoothingSec: 0.08,
				rateClamp: [0.75, 1.25],
			},
			reverb: {
				enabled: true,
				wet: 0.35,
				wetByDistance: true,
			},
			layers: [
				{
					id: 'low',
					url: '/audio/turbine.mp3',
					gain: 0.7,
					filter: {
						type: 'lowpass',
						frequency: 650,
					},
					dopplerDepth: 0.85,
					distanceDepth: 0.7,
				},
				{
					id: 'mid',
					url: '/audio/turbine.mp3',
					gain: 0.6,
					filter: {
						type: 'bandpass',
						frequency: 1800,
						Q: 0.7,
					},
					dopplerDepth: 1,
					distanceDepth: 1,
				},
				{
					id: 'high',
					url: '/audio/turbine.mp3',
					gain: 0.35,
					filter: {
						type: 'highpass',
						frequency: 3400,
					},
					dopplerDepth: 1.2,
					distanceDepth: 1.2,
				},
			],
		})

		void this.jetSource.load()

		const playButton = document.getElementById('play')
		if (playButton) {
			onClick(playButton, () => {
				void this.jetSource.toggle()
				playButton.textContent = playButton.textContent === 'Play' ? 'Stop' : 'Play'
			})
		}
	}

	render(time: number) {
		const t = time * 0.001

		const rotationX = Math.sin(t)
		const rotationY = t
		const rotationZ = Math.sin(t)

		const x = Math.sin(t / 4) * 4
		const y = Math.cos(t)
		const z = Math.sin(t)

		// this.trackedObject.rotation.x = rotationX
		// this.trackedObject.rotation.y = rotationY
		// this.trackedObject.rotation.z = rotationZ

		// this.trackedObject.position.x = x
		// this.trackedObject.position.y = y
		// this.trackedObject.position.z = z

		this.trackedObject.updateVelocity(time)
		this.jetSource.setKinematics({
			position: this.trackedObject.position,
			velocity: this.trackedObject.velocity,
		})
		this.audioEngine.update(time)
	}

	getListenerState() {
		const timeSec = performance.now() * 0.001
		const dt = this.prevTimeSec > 0 ? timeSec - this.prevTimeSec : 0

		if (dt > 0) {
			this.listenerVelocity
				.copy(camera.position)
				.sub(this.prevListenerPos)
				.divideScalar(dt)
		}

		this.prevTimeSec = timeSec
		this.prevListenerPos.copy(camera.position)

		this.listenerQuat.copy(camera.quaternion)
		this.listenerForward
			.set(0, 0, -1)
			.applyQuaternion(this.listenerQuat)
			.normalize()
		this.listenerRight.set(1, 0, 0).applyQuaternion(this.listenerQuat).normalize()

		return {
			position: camera.position,
			velocity: this.listenerVelocity,
			forward: this.listenerForward,
			right: this.listenerRight,
		}
	}
}

export default new Scene()
