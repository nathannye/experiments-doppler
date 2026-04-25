import Camera from './gl/camera'
import Renderer from './gl/renderer'
import Scene from './gl/scene'
import { resizeScreen } from './gl/screen'
import './styles/style.css'
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
		Scene.resize(window.innerWidth, window.innerHeight)
	}

	init() {
		Resizer.add(this.resize)
		Raf.add(this.render)
	}

	render(time: number) {
		Scene.render(time)
	}
}

new App()
