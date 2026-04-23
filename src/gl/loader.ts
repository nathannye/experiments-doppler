import { GLTFLoader } from 'three/examples/jsm/Addons.js'

const LOADER_MAP = {
	glb: GLTFLoader,
}

export class AssetLoader {
	items: { name: string; url: string }[] = []

	constructor(items: { name: string; url: string }[]) {
		this.items = items

		this.load()
	}

	async load() {
		if (Object.keys(this.items).length === 0) {
			console.log('No assets to load')
			return
		}

		const assetsToLoad = Object.entries(this.items)

		console.log({ assetsToLoad })

		return Promise.all(
			assetsToLoad.map(async ([name, item]) => {
				const loader = new LOADER_MAP[item.type]()
				return loader.load(item.url, (gltf) => {
					this.items[item.name] = gltf
				})
			}),
		)
	}
}
