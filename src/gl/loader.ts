import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { ASSETS } from '../constants'

const EXTENSION_TO_LOADER = {
	gltf: ['glb', 'gltf'],
}

type AssetSource = { url: string; name: string }

function getLoaderKeyFromExtension(extension) {
	for (const [loaderKey, extensions] of Object.entries(EXTENSION_TO_LOADER)) {
		if (extensions.includes(extension)) {
			return loaderKey
		}
	}
	return null
}

class LoadManager {
	loaded: number
	toLoad: number
	items: Map<string, unknown>
	loaders: Record<string, GLTFLoader>

	constructor() {
		this.loaded = 0
		this.toLoad = Object.keys(ASSETS).length
		this.items = new Map()

		this.loaders = {
			gltf: new GLTFLoader(),
		}
	}

	getItem(name) {
		return this.items.get(name)
	}

	onLoadItem() {}

	createResourcePromise(source: AssetSource) {
		return new Promise((resolve) => {
			const extension = source.url.split('.').pop().toLowerCase()
			const loaderKey = getLoaderKeyFromExtension(extension)

			if (!loaderKey) {
				console.warn(`File extension .${extension} not supported`)
				resolve(null)
				return
			}

			const loader = this.loaders[loaderKey]
			if (!loader) {
				console.warn(`No loader found for extension .${extension}`)
				resolve(null)
				return
			}

			loader.load(
				source.url,
				(file) => {
					switch (loaderKey) {
						case 'gltf':
							file.scene.name = source.name
							break
					}

					this.loaded += 1
					this.items.set(source.name, file)

					resolve(file)
				},
				undefined,
				(error) => {
					console.log(error)
					console.warn(`Loader error: ${source.url} failed to load`)
					resolve(null)
				},
			)
		})
	}

	async start() {
		const promises = []

		Object.entries(ASSETS).forEach(([, asset]) => {
			promises.push(this.createResourcePromise(asset))
		})

		return await Promise.all(promises)
	}
}

export default new LoadManager()
