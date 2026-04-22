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
	public mesh: Mesh

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
		const rotationX = Math.sin(t)
		const rotationY = t
		const rotationZ = Math.sin(t)

		const x = Math.sin(t / 4) * 10
		const y = Math.cos(t)
		const z = Math.sin(t)

		this.mesh.rotation.x = rotationX
		this.mesh.rotation.y = rotationY
		this.mesh.rotation.z = rotationZ

		this.mesh.position.x = x
		this.mesh.position.y = y
		this.mesh.position.z = z

		doppler.update(
			distanceBetween(camera.position, this.mesh.position),
			x,
			y,
			z,
			rotationX,
			rotationY,
		)
	}
}

export default new Scene()
