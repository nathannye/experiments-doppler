import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'

export default class Ground extends Mesh {
	constructor() {
		super()

		this.geometry = new PlaneGeometry(100, 100)
		this.material = new MeshBasicMaterial({ color: 0x00ff00 })

		this.rotation.x = -Math.PI / 2
		this.position.y = -3
	}
}
