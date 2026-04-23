import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three'

export class TrackedObject extends Mesh {
	prevTimeSec = 0
	prevPos = new Vector3()
	velocity = new Vector3(0, 0, 0)

	constructor() {
		super(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0x00ff00 }))
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
