import {
	AerialPerspectiveEffect,
	getECIToECEFRotationMatrix,
	getMoonDirectionECI,
	getSunDirectionECI,
	PrecomputedTexturesGenerator,
	SkyLightProbe,
	SkyMaterial,
	SunDirectionalLight,
} from '@takram/three-atmosphere'
import {
	EffectComposer,
	EffectPass,
	RenderPass,
	ToneMappingEffect,
	ToneMappingMode,
} from 'postprocessing'
import {
	HalfFloatType,
	Matrix4,
	Mesh,
	NoToneMapping,
	type PerspectiveCamera,
	PlaneGeometry,
	type Scene,
	Timer,
	Vector3,
	type WebGLRenderer,
} from 'three'

interface AtmosphereOptions {
	scene: Scene
	camera: PerspectiveCamera
	renderer: WebGLRenderer
	sunTarget?: Vector3
}

export class Atmosphere {
	private scene: Scene
	private camera: PerspectiveCamera
	private renderer: WebGLRenderer
	private sunTarget?: Vector3
	private timer = new Timer()
	private referenceDate = new Date('2000-06-01T10:00:00Z')
	private inertialToECEFMatrix = new Matrix4()
	private sunDirection = new Vector3()
	private moonDirection = new Vector3()
	private skyMaterial = new SkyMaterial()
	private sky = new Mesh(new PlaneGeometry(2, 2), this.skyMaterial)
	private sunLight = new SunDirectionalLight({ distance: 300 })
	private skyLight = new SkyLightProbe()
	private aerialPerspective: AerialPerspectiveEffect
	private composer: EffectComposer
	private texturesGenerator: PrecomputedTexturesGenerator

	constructor(options: AtmosphereOptions) {
		this.scene = options.scene
		this.camera = options.camera
		this.renderer = options.renderer
		this.sunTarget = options.sunTarget

		this.renderer.toneMapping = NoToneMapping
		this.renderer.toneMappingExposure = 2

		this.sunLight.castShadow = true
		this.sunLight.shadow.camera.top = 300
		this.sunLight.shadow.camera.bottom = -300
		this.sunLight.shadow.camera.left = -300
		this.sunLight.shadow.camera.right = 300
		this.sunLight.shadow.camera.near = 0
		this.sunLight.shadow.camera.far = 600
		this.sunLight.shadow.mapSize.width = 2048
		this.sunLight.shadow.mapSize.height = 2048
		this.sunLight.shadow.normalBias = 1

		this.sky.frustumCulled = false

		this.aerialPerspective = new AerialPerspectiveEffect(this.camera)
		this.composer = new EffectComposer(this.renderer, {
			frameBufferType: HalfFloatType,
			multisampling: 8,
		})
		this.composer.addPass(new RenderPass(this.scene, this.camera))
		this.composer.addPass(new EffectPass(this.camera, this.aerialPerspective))
		this.composer.addPass(
			new EffectPass(
				this.camera,
				new ToneMappingEffect({ mode: ToneMappingMode.AGX }),
			),
		)

		this.scene.add(this.sky)
		this.scene.add(this.sunLight)
		this.scene.add(this.sunLight.target)
		this.scene.add(this.skyLight)

		this.texturesGenerator = new PrecomputedTexturesGenerator(this.renderer)
		this.initializePrecomputedTextures()
	}

	resize(width: number, height: number): void {
		this.composer.setSize(width, height)
	}

	render(time: number): void {
		this.timer.update(time)

		if (this.sunTarget) {
			this.sunLight.target.position.copy(this.sunTarget)
			this.skyLight.position.copy(this.sunTarget)
		}

		const date = +this.referenceDate + ((this.timer.getElapsed() * 5e6) % 864e5)
		getECIToECEFRotationMatrix(date, this.inertialToECEFMatrix)
		getSunDirectionECI(date, this.sunDirection).applyMatrix4(
			this.inertialToECEFMatrix,
		)
		getMoonDirectionECI(date, this.moonDirection).applyMatrix4(
			this.inertialToECEFMatrix,
		)

		this.skyMaterial.sunDirection.copy(this.sunDirection)
		this.skyMaterial.moonDirection.copy(this.moonDirection)
		this.sunLight.sunDirection.copy(this.sunDirection)
		this.skyLight.sunDirection.copy(this.sunDirection)
		this.aerialPerspective.sunDirection.copy(this.sunDirection)

		this.sunLight.update()
		this.skyLight.update()
		this.composer.render()
	}

	dispose(): void {
		this.scene.remove(this.sky)
		this.scene.remove(this.sunLight)
		this.scene.remove(this.sunLight.target)
		this.scene.remove(this.skyLight)
		this.composer.dispose()
	}

	private initializePrecomputedTextures(): void {
		this.texturesGenerator
			.update()
			.then(() => {
				const { textures } = this.texturesGenerator
				Object.assign(this.skyMaterial, textures)
				this.sunLight.transmittanceTexture = textures.transmittanceTexture
				this.skyLight.irradianceTexture = textures.irradianceTexture
				Object.assign(this.aerialPerspective, textures)
			})
			.catch((error: unknown) => {
				console.error('Failed to initialize atmosphere textures', error)
			})
	}
}
