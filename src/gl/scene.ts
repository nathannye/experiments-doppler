import { Quaternion, Scene as ThreeScene, Vector3 } from 'three'
import { Atmosphere } from '../atmosphere'
import { AudioEngine } from '../audio/engine'
import { SpatialSource } from '../audio/source'
import { onClick } from '../utils/events'
import camera from './camera'
import { Controls } from './controls'
import Ground from './ground'
import loader from './loader'
import renderer from './renderer'
import { Tiles } from './tiles'
import { TrackedObject } from './tracked-object'

class Scene extends ThreeScene {
	private static readonly TILESET_CENTER = new Vector3(
		3504433.11390561,
		630756.924314819,
		5273988.36392288,
	)
	private static readonly SPAWN_ALTITUDE = 120
	private static readonly CAMERA_BACKOFF = 360
	private static readonly CAMERA_SIDE = 180

	loaded = false
	trackedObject!: TrackedObject
	audioEngine!: AudioEngine
	jetSource!: SpatialSource
	atmosphere!: Atmosphere
	controls!: Controls
	tiles!: Tiles
	listenerVelocity = new Vector3()
	prevListenerPos = new Vector3()
	prevTimeSec = 0
	listenerForward = new Vector3(0, 0, -1)
	listenerRight = new Vector3(1, 0, 0)
	listenerQuat = new Quaternion()
	motionOrigin = new Vector3()
	motionEast = new Vector3(1, 0, 0)
	motionNorth = new Vector3(0, 0, 1)
	motionScratch = new Vector3()
	motionRadius = 0

	constructor() {
		super()

		this.loaded = false

		loader.start().then(() => {
			console.log('assets loaded')
			this.loaded = true
			this.init()
		})
	}

	init() {
		const tilesetCenter = Scene.TILESET_CENTER.clone()
		const localUp = tilesetCenter.clone().normalize()
		const side = new Vector3().crossVectors(localUp, new Vector3(0, 0, 1))
		if (side.lengthSq() === 0) {
			side.set(1, 0, 0)
		} else {
			side.normalize()
		}

		const trackedPosition = tilesetCenter
			.clone()
			.addScaledVector(localUp, Scene.SPAWN_ALTITUDE)
		const cameraPosition = trackedPosition
			.clone()
			.addScaledVector(localUp, Scene.CAMERA_BACKOFF)
			.addScaledVector(side, Scene.CAMERA_SIDE)
		const north = new Vector3().crossVectors(localUp, side).normalize()

		camera.position.copy(cameraPosition)
		camera.up.copy(localUp)
		camera.lookAt(trackedPosition)
		this.motionOrigin.copy(trackedPosition)
		this.motionEast.copy(side)
		this.motionNorth.copy(north)
		this.motionRadius = trackedPosition.length()

		this.trackedObject = new TrackedObject()
		this.trackedObject.position.copy(trackedPosition)
		this.add(this.trackedObject)
		this.atmosphere = new Atmosphere({
			scene: this,
			camera,
			renderer,
			sunTarget: this.trackedObject.position,
		})
		this.controls = new Controls(camera, renderer.domElement)
		this.controls.target.copy(this.trackedObject.position)
		this.controls.minDistance = 25
		this.controls.maxDistance = 8000
		this.controls.update()
		this.tiles = new Tiles({
			url: 'https://sdfe-hosting.virtualcitymap.de/Aarhus/datasource-data/Aarhus_Mesh/tileset.json',
			scene: this,
			camera,
			renderer,
		})

		this.audioEngine = new AudioEngine({
			listenerProvider: () => this.getListenerState(),
			defaultReverbWet: 0.65,
		})

		const ground = new Ground()
		this.add(ground)

		this.jetSource = new SpatialSource(this.audioEngine, {
			loop: true,
			baseGain: 1,
			distance: {
				enabled: true,
				model: 'inverse',
				minDistance: 20,
				maxDistance: 6000,
			},
			pan: {
				enabled: true,
				mode: 'hrtf3d',
				smoothing: 0.32,
			},
			doppler: {
				enabled: true,
				depth: 1.7,
				smoothingSec: 0.5,
				rateClamp: [0.75, 1.25],
			},
			reverb: {
				enabled: true,
				wet: 0.3,
				wetByDistance: true,
			},
			airAbsorption: {
				enabled: true,
				minDistance: 1,
				maxDistance: 1000,
				minCutoffHz: 500,
				maxCutoffHz: 6000,
				curve: 2,
				smoothingSec: 0.1,
			},
			layers: [
				{
					id: 'low',
					url: '/audio/turbine.mp3',
					gain: 4,
					filter: {
						type: 'lowpass',
						frequency: 1000,
					},
					dopplerDepth: 0.85,
					distanceDepth: 0.6,
				},
				{
					id: 'mid',
					url: '/audio/turbine.mp3',
					gain: 2.2,
					filter: {
						type: 'bandpass',
						frequency: 2100,
						Q: 0.2,
					},
					dopplerDepth: 3,
					distanceDepth: 1.05,
				},
				{
					id: 'high',
					url: '/audio/turbine.mp3',
					gain: 0.6,
					filter: {
						type: 'highpass',
						frequency: 5800,
					},
					dopplerDepth: 1,
					distanceDepth: 2.5,
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
		if (!this.loaded) return

		const orbitPhase = time * 0.00042
		const orbitRadius = 550
		this.motionScratch
			.copy(this.motionOrigin)
			.addScaledVector(this.motionEast, Math.sin(orbitPhase) * orbitRadius)
			.addScaledVector(this.motionNorth, Math.cos(orbitPhase) * orbitRadius)
			.normalize()
			.multiplyScalar(this.motionRadius)
		this.trackedObject.position.copy(this.motionScratch)

		this.trackedObject.updateVelocity(time)
		this.jetSource.setKinematics({
			position: this.trackedObject.position,
			velocity: this.trackedObject.velocity,
		})
		this.controls.update()
		this.tiles.update()
		this.audioEngine.update(time)
		this.atmosphere.render(time / 9999)
	}

	resize(width: number, height: number) {
		if (this.loaded) {
			this.atmosphere.resize(width, height)
			this.tiles.resize()
		}
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
