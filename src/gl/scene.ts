import {
	BoxGeometry,
	Mesh,
	MeshBasicMaterial,
	Scene as ThreeScene,
} from 'three'

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
		this.mesh.rotation.x = time * 0.001
		this.mesh.rotation.y = time * 0.001
	}
}

export default new Scene()
