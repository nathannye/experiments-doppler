import { AmbientLight, Group, Vector3 } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import loader from './loader'

export class TrackedObject extends Group {
	prevTimeSec = 0
	prevPos = new Vector3()
	velocity = new Vector3(0, 0, 0)

	constructor() {
		super()

		const rafale = loader.getItem('rafale') as GLTF
		const light = new AmbientLight(0xffffff, 5)
		this.add(light)
		this.add(rafale.scene)

		const s = 0.04

		this.scale.set(s, s, s)
	}

	updateVelocity(time: number) {
		const t = time * 0.001
		const dt = t - this.prevTimeSec

		if (dt > 0) {
			this.velocity.copy(this.position).sub(this.prevPos).divideScalar(dt)
		}

		this.prevPos.copy(this.position)
		this.prevTimeSec = t
	}
}
