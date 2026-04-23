import { Vector3 } from 'three'
import { getAudioBuffer } from '../utils/file'
import { clamp, lerp } from '../utils/math'
import { getDistanceGain } from './effects/distance'
import { getDopplerPlaybackRate } from './effects/doppler'
import { getStereoPan } from './effects/pan'
import { getReverbWetGain } from './effects/reverb-send'
import type { AudioEngine } from './engine'
import type {
	AudioEngineTick,
	DistanceOptions,
	LayerConfig,
	PanMode,
	SourceUpdateInput,
	SpatialSourceOptions,
} from './types'

interface RuntimeLayer {
	config: LayerConfig
	buffer: AudioBuffer
	source: AudioBufferSourceNode | null
	staticGain: GainNode
	filter: BiquadFilterNode | null
}

export class SpatialSource {
	private engine: AudioEngine
	private options: SpatialSourceOptions
	private loaded = false
	private started = false
	private paused = true
	private unsub: (() => void) | null = null

	private sourcePosition = new Vector3()
	private sourceVelocity = new Vector3()
	private scratchA = new Vector3()
	private scratchB = new Vector3()
	private scratchC = new Vector3()

	private mixGain: GainNode
	private panMode: PanMode
	private stereoPanner: StereoPannerNode | null = null
	private spatialPanner: PannerNode | null = null
	private distanceGain: GainNode
	private dryGain: GainNode
	private wetGain: GainNode
	private wetOverrideConvolver: ConvolverNode | null = null
	private wetOverrideOut: GainNode | null = null

	private layers: RuntimeLayer[] = []

	constructor(engine: AudioEngine, options: SpatialSourceOptions) {
		this.engine = engine
		this.options = options

		this.mixGain = this.engine.ctx.createGain()
		this.panMode = options.pan?.mode ?? 'stereo'
		this.distanceGain = this.engine.ctx.createGain()
		this.dryGain = this.engine.ctx.createGain()
		this.wetGain = this.engine.ctx.createGain()

		this.mixGain.gain.value = options.baseGain ?? 1
		this.dryGain.gain.value = 1
		this.wetGain.gain.value = options.reverb?.enabled
			? (options.reverb.wet ?? 0.25)
			: 0

		if (this.panMode === 'stereo') {
			this.stereoPanner = this.engine.ctx.createStereoPanner()
			this.mixGain.connect(this.stereoPanner)
			this.stereoPanner.connect(this.distanceGain)
		} else {
			this.spatialPanner = this.createSpatialPanner(this.panMode, options.distance)
			this.mixGain.connect(this.spatialPanner)
			this.spatialPanner.connect(this.distanceGain)
		}

		this.distanceGain.connect(this.dryGain)
		this.dryGain.connect(this.engine.masterGain)
	}

	async load(): Promise<void> {
		if (this.loaded) return

		const layerConfigs = this.resolveLayerConfigs()
		const layers = await Promise.all(
			layerConfigs.map(async (config) => {
				const buffer = await getAudioBuffer(config.url, this.engine.ctx)
				const staticGain = this.engine.ctx.createGain()
				staticGain.gain.value = config.gain ?? 1

				let filter: BiquadFilterNode | null = null
				if (config.filter) {
					filter = this.engine.ctx.createBiquadFilter()
					filter.type = config.filter.type
					filter.frequency.value = config.filter.frequency
					if (typeof config.filter.Q === 'number') {
						filter.Q.value = config.filter.Q
					}
				}

				return {
					config,
					buffer,
					source: null,
					staticGain,
					filter,
				} satisfies RuntimeLayer
			}),
		)

		this.layers = layers
		this.setupWetRouting()
		this.loaded = true
	}

	async play(): Promise<void> {
		if (!this.loaded) {
			await this.load()
		}

		await this.engine.resume()

		if (!this.started) {
			this.createLayerSources()
			for (const layer of this.layers) {
				layer.source?.start()
			}
			this.started = true
		}

		this.paused = false
		this.mixGain.gain.value = this.options.baseGain ?? 1

		if (!this.unsub) {
			this.unsub = this.engine.add((tick) => this.onEngineTick(tick))
		}
	}

	pause(): void {
		this.paused = true
		this.mixGain.gain.value = 0
	}

	async toggle(): Promise<void> {
		if (this.paused) {
			await this.play()
		} else {
			this.pause()
		}
	}

	stop(): void {
		this.paused = true
		this.mixGain.gain.value = 0

		for (const layer of this.layers) {
			if (layer.source) {
				layer.source.stop()
				layer.source.disconnect()
				layer.source = null
			}
		}

		this.started = false
	}

	dispose(): void {
		this.stop()
		this.unsub?.()
		this.unsub = null
		this.mixGain.disconnect()
		this.stereoPanner?.disconnect()
		this.spatialPanner?.disconnect()
		this.distanceGain.disconnect()
		this.dryGain.disconnect()
		this.wetGain.disconnect()
		this.wetOverrideConvolver?.disconnect()
		this.wetOverrideOut?.disconnect()
	}

	setKinematics(input: SourceUpdateInput): void {
		this.sourcePosition.copy(input.position)
		this.sourceVelocity.copy(input.velocity)
	}

	private resolveLayerConfigs(): LayerConfig[] {
		if (this.options.layers && this.options.layers.length > 0) {
			return this.options.layers
		}

		if (!this.options.url) {
			throw new Error(
				'SpatialSource requires either options.url or options.layers',
			)
		}

		return [
			{
				id: 'main',
				url: this.options.url,
			},
		]
	}

	private setupWetRouting(): void {
		const reverbEnabled = this.options.reverb?.enabled ?? false
		if (!reverbEnabled) {
			this.wetGain.gain.value = 0
			return
		}

		const wetOverride = this.options.reverb?.impulseUrlOverride
		this.distanceGain.connect(this.wetGain)

		if (!wetOverride) {
			this.wetGain.connect(this.engine.reverbInput)
			return
		}

		this.wetOverrideConvolver = this.engine.ctx.createConvolver()
		this.wetOverrideOut = this.engine.ctx.createGain()
		this.wetOverrideOut.gain.value = 1

		void getAudioBuffer(wetOverride, this.engine.ctx).then((buffer) => {
			if (this.wetOverrideConvolver) {
				this.wetOverrideConvolver.buffer = buffer
			}
		})

		this.wetGain.connect(this.wetOverrideConvolver)
		this.wetOverrideConvolver.connect(this.wetOverrideOut)
		this.wetOverrideOut.connect(this.engine.masterGain)
	}

	private createLayerSources(): void {
		for (const layer of this.layers) {
			const source = this.engine.ctx.createBufferSource()
			source.buffer = layer.buffer
			source.loop = this.options.loop ?? true
			source.detune.value = layer.config.detuneCents ?? 0

			if (layer.filter) {
				source.connect(layer.filter)
				layer.filter.connect(layer.staticGain)
			} else {
				source.connect(layer.staticGain)
			}

			layer.staticGain.connect(this.mixGain)
			layer.source = source
		}
	}

	private onEngineTick(tick: AudioEngineTick): void {
		if (!this.started || this.paused || !this.loaded) {
			return
		}

		const distanceOptions = this.options.distance
		const dopplerOptions = this.options.doppler
		const panOptions = this.options.pan
		const reverbOptions = this.options.reverb
		const useThreeDPanner = this.panMode !== 'stereo'

		const distance = tick.listener.position.distanceTo(this.sourcePosition)
		const distanceGainValue =
			distanceOptions?.enabled === false
				? 1
				: getDistanceGain(
						distance,
						distanceOptions?.model,
						distanceOptions?.minDistance,
						distanceOptions?.maxDistance,
					)

		if (useThreeDPanner) {
			this.distanceGain.gain.value = 1
			this.updateListenerSpatialState(tick)
			this.updateSourceSpatialState(tick)
		} else {
			this.distanceGain.gain.value = distanceGainValue
		}

		if (!useThreeDPanner && panOptions?.enabled !== false && this.stereoPanner) {
			const targetPan = getStereoPan(
				this.sourcePosition,
				tick.listener.position,
				tick.listener.right,
				tick.listener.forward,
			)
			const panDepth = this.layers[0]?.config.panDepth ?? 1
			const dampenedPan = clamp(-1, 1, targetPan * panDepth)
			const panSmoothing = panOptions?.smoothing ?? 0.1
			this.stereoPanner.pan.value = lerp(
				dampenedPan,
				this.stereoPanner.pan.value,
				panSmoothing,
			)
		}

		this.scratchA
			.copy(tick.listener.position)
			.sub(this.sourcePosition)
			.normalize()
		const radialVelocity = this.sourceVelocity.dot(this.scratchA)
		const observerRadialVelocity = tick.listener.velocity
			? tick.listener.velocity.dot(this.scratchA)
			: 0

		for (const layer of this.layers) {
			const depth = (dopplerOptions?.depth ?? 1) * (layer.config.dopplerDepth ?? 1)
			const rate =
				dopplerOptions?.enabled === false
					? 1
					: getDopplerPlaybackRate(
							radialVelocity,
							observerRadialVelocity,
							depth,
							dopplerOptions?.rateClamp,
						)

			layer.source?.playbackRate.setTargetAtTime(
				rate,
				tick.audioTime,
				dopplerOptions?.smoothingSec ?? 0.08,
			)

			const layerDistanceDepth = layer.config.distanceDepth ?? 1
			const layerGain = layer.config.gain ?? 1
			const distanceFactor = useThreeDPanner
				? 1
				: Math.pow(distanceGainValue, layerDistanceDepth)
			layer.staticGain.gain.value = layerGain * distanceFactor
		}

		const wetBase = reverbOptions?.enabled ? (reverbOptions.wet ?? 0.25) : 0
		const wet = getReverbWetGain(
			wetBase,
			distance,
			reverbOptions?.wetByDistance ?? false,
			distanceOptions?.maxDistance ?? 100,
		)

		this.wetGain.gain.value = wet
	}

	private createSpatialPanner(
		mode: Exclude<PanMode, 'stereo'>,
		distanceOptions?: DistanceOptions,
	): PannerNode {
		const panner = this.engine.ctx.createPanner()
		panner.panningModel = mode === 'hrtf3d' ? 'HRTF' : 'equalpower'
		panner.distanceModel = this.getPannerDistanceModel(distanceOptions?.model)
		panner.refDistance = distanceOptions?.minDistance ?? 1
		panner.maxDistance = distanceOptions?.maxDistance ?? 100
		panner.rolloffFactor = distanceOptions?.enabled === false ? 0 : 1
		return panner
	}

	private getPannerDistanceModel(model?: DistanceOptions['model']): DistanceModelType {
		switch (model) {
			case 'linear':
				return 'linear'
			case 'inverseSquare':
				return 'exponential'
			case 'inverse':
			default:
				return 'inverse'
		}
	}

	private updateListenerSpatialState(tick: AudioEngineTick): void {
		const listener = this.engine.ctx.listener
		const endTime = tick.audioTime + Math.max(0.01, tick.deltaSec || 1 / 60)
		this.scratchB
			.copy(tick.listener.forward)
			.cross(tick.listener.right)
			.normalize()

		if (listener.positionX) {
			listener.positionX.linearRampToValueAtTime(tick.listener.position.x, endTime)
			listener.positionY.linearRampToValueAtTime(tick.listener.position.y, endTime)
			listener.positionZ.linearRampToValueAtTime(tick.listener.position.z, endTime)
			listener.forwardX.linearRampToValueAtTime(tick.listener.forward.x, endTime)
			listener.forwardY.linearRampToValueAtTime(tick.listener.forward.y, endTime)
			listener.forwardZ.linearRampToValueAtTime(tick.listener.forward.z, endTime)
			listener.upX.linearRampToValueAtTime(this.scratchB.x, endTime)
			listener.upY.linearRampToValueAtTime(this.scratchB.y, endTime)
			listener.upZ.linearRampToValueAtTime(this.scratchB.z, endTime)
			return
		}

		listener.setPosition(
			tick.listener.position.x,
			tick.listener.position.y,
			tick.listener.position.z,
		)
		listener.setOrientation(
			tick.listener.forward.x,
			tick.listener.forward.y,
			tick.listener.forward.z,
			this.scratchB.x,
			this.scratchB.y,
			this.scratchB.z,
		)
	}

	private updateSourceSpatialState(tick: AudioEngineTick): void {
		if (!this.spatialPanner) {
			return
		}

		const panner = this.spatialPanner
		const smoothingSec = Math.max(0.01, (this.options.pan?.smoothing ?? 0.1) * 0.2)
		const endTime = tick.audioTime + smoothingSec

		this.scratchC.copy(tick.listener.position).sub(this.sourcePosition)
		if (this.scratchC.lengthSq() === 0) {
			this.scratchC.set(0, 0, 1)
		} else {
			this.scratchC.normalize()
		}

		if (panner.positionX) {
			panner.positionX.linearRampToValueAtTime(this.sourcePosition.x, endTime)
			panner.positionY.linearRampToValueAtTime(this.sourcePosition.y, endTime)
			panner.positionZ.linearRampToValueAtTime(this.sourcePosition.z, endTime)
			panner.orientationX.linearRampToValueAtTime(this.scratchC.x, endTime)
			panner.orientationY.linearRampToValueAtTime(this.scratchC.y, endTime)
			panner.orientationZ.linearRampToValueAtTime(this.scratchC.z, endTime)
			return
		}

		panner.setPosition(this.sourcePosition.x, this.sourcePosition.y, this.sourcePosition.z)
		panner.setOrientation(this.scratchC.x, this.scratchC.y, this.scratchC.z)
	}
}
