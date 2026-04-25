import { PerspectiveCamera } from 'three'
import { screen } from './screen'

class Camera extends PerspectiveCamera {
	constructor(fov: number, aspect: number, near: number, far: number) {
		super(fov, aspect, near, far)

		this.init()
	}

	init() {
		this.position.set(0, 0, 10)
	}

	resize() {
		this.aspect = screen.x / screen.y
		this.updateProjectionMatrix()
	}
}

export default new Camera(75, screen.x / screen.y, 0.1, 1000)
