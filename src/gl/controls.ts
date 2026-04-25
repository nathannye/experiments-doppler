import type { PerspectiveCamera } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export class Controls extends OrbitControls {
	constructor(camera: PerspectiveCamera, domElement: HTMLElement) {
		super(camera, domElement)
		this.enableDamping = true
		this.dampingFactor = 0.08
	}
}
