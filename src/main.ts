import Camera from './gl/camera'
import Renderer from './gl/renderer'
import Scene from './gl/scene'
import { resizeScreen } from './gl/screen'
import './styles/style.css'
import { screen } from './gl/screen'
import { Raf } from './subscribers/raf'
import { Resizer } from './subscribers/resizer'

export default class App {
	constructor() {
		this.init()
		this.resize()
	}

	resize() {
		resizeScreen()
		Camera.resize()
		Renderer.resize()
	}

	init() {
		Resizer.add(this.resize)
		Raf.add(this.render)
	}

	render(time: number) {
		Renderer.render(Scene, Camera)
		Scene.render(time)
	}
}

new App()
