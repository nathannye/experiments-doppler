import { TilesRenderer } from '3d-tiles-renderer'
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three'

interface TilesOptions {
	url: string
	scene: Scene
	camera: PerspectiveCamera
	renderer: WebGLRenderer
}

export class Tiles {
	private scene: Scene
	private camera: PerspectiveCamera
	private renderer: WebGLRenderer
	private tilesRenderer: TilesRenderer

	constructor(options: TilesOptions) {
		this.scene = options.scene
		this.camera = options.camera
		this.renderer = options.renderer
		this.tilesRenderer = new TilesRenderer(options.url)

		this.scene.add(this.tilesRenderer.group)
		this.tilesRenderer.setCamera(this.camera)
		this.tilesRenderer.setResolutionFromRenderer(this.camera, this.renderer)
	}

	update(): void {
		this.tilesRenderer.update()
	}

	resize(): void {
		this.tilesRenderer.setResolutionFromRenderer(this.camera, this.renderer)
	}
}
