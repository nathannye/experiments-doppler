import {
	Scene as ThreeScene,
} from 'three'
import doppler from '../audio-processing/doppler'
import { distanceBetween } from '../utils/distance'
import camera from './camera'
import { TrackedObject } from './tracked-object'

class Scene extends ThreeScene {
	trackedObject: TrackedObject

	constructor() {
		super()
		this.init()
	}

	init() {
		this.trackedObject = new TrackedObject()
		this.add(this.trackedObject)
	}

	render(time: number) {
		const t = time * 0.001

		const rotationX = Math.sin(t)
		const rotationY = t
		const rotationZ = Math.sin(t)

		const x = Math.sin(t / 4) * 4
		const y = Math.cos(t)
		const z = Math.sin(t)

		this.trackedObject.rotation.x = rotationX
		this.trackedObject.rotation.y = rotationY
		this.trackedObject.rotation.z = rotationZ

		this.trackedObject.position.x = x
		this.trackedObject.position.y = y
		this.trackedObject.position.z = z

		this.trackedObject.updateVelocity(time)

		doppler.update(
			distanceBetween(camera.position, this.trackedObject.position),
			x,
			y,
			z,
			this.trackedObject.velocity,
		)
	}
}

export default new Scene()
