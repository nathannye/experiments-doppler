import { WebGLRenderer } from 'three'
import { screen } from './screen'

class Renderer extends WebGLRenderer {
	constructor(canvas: HTMLCanvasElement) {
		super({ canvas })
	}

	resize() {
		this.setSize(screen.x, screen.y)
		this.setPixelRatio(screen.devicePixelRatio)
	}
}

export default new Renderer(
	document.querySelector('canvas') as HTMLCanvasElement,
)
