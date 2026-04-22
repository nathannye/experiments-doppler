import {
	BoxGeometry,
	Mesh,
	MeshBasicMaterial,
	Scene as ThreeScene,
} from 'three'
import doppler from '../audio-processing/doppler'
import { distanceBetween } from '../utils/distance'
import camera from './camera'

class Scene extends ThreeScene {
	constructor() {
		super()
		this.init()
	}

	init() {
		const cube = new BoxGeometry(1, 1, 1)
		const material = new MeshBasicMaterial({ color: 0x00ff00 })

		this.mesh = new Mesh(cube, material)
		this.mesh.position.set(0, 0, 0)

		this.add(this.mesh)
	}

	render(time: number) {
		const t = time * 0.001
		this.mesh.rotation.x = Math.sin(t)
		this.mesh.rotation.y = t
		this.mesh.rotation.z = Math.sin(t)

		this.mesh.position.x = Math.sin(t)
		// this.mesh.position.y = Math.cos(t)
		this.mesh.position.z = Math.sin(t)

		doppler.update(distanceBetween(camera.position, this.mesh.position))
	}
}

export default new Scene()
