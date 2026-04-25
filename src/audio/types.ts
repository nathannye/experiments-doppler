import type { Vector3 } from 'three'

/** Transfer function used to convert source-listener distance into amplitude attenuation. */
export type DistanceModel = 'inverseSquare' | 'inverse' | 'linear'

/** Spatial rendering mode controlling how angular position maps to binaural/stereo cues. */
export type PanMode = 'stereo' | 'hrtf3d' | 'equalpower3d'

/** Listener kinematics sampled per audio update and used by spatial + Doppler calculations. */
export interface ListenerState {
	/** Listener origin in world coordinates; reference point for distance gain and radial vectors. */
	position: Vector3
	/** Unit look direction; used to derive front/back weighting and pan damping near centerline. */
	forward: Vector3
	/** Unit lateral axis; dot product against source direction produces signed left/right pan. */
	right: Vector3
	/** Optional observer velocity (units/sec); contributes observer-side term in Doppler ratio. */
	velocity?: Vector3
}

/** Pull-based listener sampler invoked each engine tick before source processing. */
export type ListenerProvider = () => ListenerState

/** Time-varying source state consumed by one SpatialSource instance. */
export interface SourceUpdateInput {
	/** Emitter origin in world coordinates for directional and distance calculations. */
	position: Vector3
	/** Emitter velocity (units/sec); projected onto listener axis to drive Doppler shift sign/magnitude. */
	velocity: Vector3
}

/** Controls for kinematic pitch modulation via Doppler playback-rate automation. */
export interface DopplerOptions {
	/** Enables Doppler modulation. When false, playbackRate remains neutral at 1.0. */
	enabled?: boolean
	/**
	 * AudioParam smoothing constant (seconds) for playbackRate target transitions.
	 * Higher values reduce zipper noise but increase response lag on fast fly-bys.
	 */
	smoothingSec?: number
	/**
	 * Safety bounds for playbackRate ratio after Doppler math.
	 * Prevents extreme resampling artifacts, aliasing, or chipmunk/slowdown edges.
	 */
	rateClamp?: [number, number]
	/**
	 * Artistic scale on radial-velocity contribution.
	 * 1 = physically direct mapping, <1 = subtle, >1 = exaggerated cinematic shift.
	 */
	depth?: number
}

/** Distance attenuation and propagation shaping controls. */
export interface DistanceOptions {
	/** Enables distance-based amplitude falloff. */
	enabled?: boolean
	/**
	 * Amplitude curve:
	 * - inverseSquare approximates free-field energy dispersion,
	 * - inverse is softer for game readability,
	 * - linear is stylized and easier to tune for near-field presence.
	 */
	model?: DistanceModel
	/** Near-field floor distance to avoid singular gain spikes close to the emitter. */
	minDistance?: number
	/** Far-field bound for attenuation normalization and optional wet scaling logic. */
	maxDistance?: number
}

/** Angular localization controls (left/right placement and smoothing). */
export interface PanOptions {
	/** Enables pan automation from source/listener orientation. */
	enabled?: boolean
	/** Rendering mode used by the source panning stage. */
	mode?: PanMode
	/**
	 * Inter-frame interpolation factor for pan updates.
	 * Lower values stabilize image, higher values increase motion precision.
	 */
	smoothing?: number
}

/** Per-source send behavior into the reverberant field. */
export interface ReverbOptions {
	/** Enables wet branch routing in parallel with dry/direct path. */
	enabled?: boolean
	/** Baseline send level to reverb bus (0..1). */
	wet?: number
	/**
	 * If true, increases reverberant contribution with distance,
	 * approximating direct-to-reverberant ratio changes in larger spaces.
	 */
	wetByDistance?: boolean
	/** Optional IR override for this emitter, replacing engine default convolution profile. */
	impulseUrlOverride?: string
}

/** High-frequency attenuation caused by air propagation over distance. */
export interface AirAbsorptionOptions {
	/** Enables distance-driven high-frequency rolloff. */
	enabled?: boolean
	/** Distance where rolloff begins (meters / world units). */
	minDistance?: number
	/** Distance where max attenuation is reached. */
	maxDistance?: number
	/** Cutoff at far distance; lower values sound more muffled. */
	minCutoffHz?: number
	/** Cutoff at near distance; usually close to full-band. */
	maxCutoffHz?: number
	/**
	 * Response shaping exponent.
	 * >1 delays attenuation until farther distances; <1 starts rolloff earlier.
	 */
	curve?: number
	/** AudioParam smoothing constant in seconds for cutoff transitions. */
	smoothingSec?: number
}

/** Spectral shaping stage applied per layer before summing into the source mix bus. */
export interface LayerFilterOptions {
	/** Filter topology (e.g. lowpass, bandpass, highpass) controlling spectral region emphasis. */
	type: BiquadFilterType
	/** Cutoff/center frequency in Hz where tonal emphasis or attenuation pivots. */
	frequency: number
	/** Optional resonance/bandwidth control; higher Q yields narrower spectral focus. */
	Q?: number
}

/** One spectral/timbral lane inside a layered emitter model. */
export interface LayerConfig {
	/** Stable layer id for diagnostics and authoring clarity. */
	id: string
	/** Asset URL decoded into this layer's buffer source. */
	url: string
	/** Static gain trim before dynamic automation (distance, Doppler, pan effects still apply). */
	gain?: number
	/** Constant pitch offset in cents to widen/characterize layered engine tone. */
	detuneCents?: number
	/** Optional tone-shaping filter to isolate low/mid/high components. */
	filter?: LayerFilterOptions
	/** Multiplier on Doppler depth for this layer (e.g. highs react more than lows). */
	dopplerDepth?: number
	/** Per-layer falloff weighting to keep lows present while highs decay faster. */
	distanceDepth?: number
	/** Lateral localization weighting for this layer (0 = center-locked, 1 = full pan). */
	panDepth?: number
	/** Optional wet-send weighting for layer-specific room contribution control. */
	reverbSend?: number
}

/** Runtime view of one layer exposed to source plugins during tick processing. */
export interface SourcePluginLayerState {
	/** Stable layer id matching LayerConfig.id. */
	id: string
	/** Layer authoring config. */
	config: LayerConfig
	/** Layer gain node driven by source runtime processing. */
	gainNode: GainNode
	/** Buffer source for playback-rate automation or custom modulation. */
	source: AudioBufferSourceNode | null
	/** Gain computed by core source processing before plugin adjustments. */
	computedGain: number
}

/** Tick payload delivered to source plugins after core spatial/Doppler updates. */
export interface SourcePluginTickContext {
	/** Engine tick info with audioTime and listener state. */
	tick: AudioEngineTick
	/** Current source-listener distance. */
	distance: number
	/** Source radial velocity projected onto listener-source axis. */
	radialVelocity: number
	/** Observer radial velocity projected onto listener-source axis. */
	observerRadialVelocity: number
	/** Distance gain value computed by current distance model. */
	distanceGain: number
	/** Whether panning mode uses a Three.js 3D panner node. */
	useThreeDPanner: boolean
	/** Mutable layer runtime state for plugin modulation. */
	layers: SourcePluginLayerState[]
}

/** Source plugin contract for optional procedural audio behaviors. */
export interface SourcePlugin {
	/** Called once after layer configs are resolved and decoded. */
	onInit?(ctx: { audioContext: AudioContext; layerConfigs: LayerConfig[] }): void
	/** Called once per audio engine tick after core source processing. */
	onTick?(ctx: SourcePluginTickContext): void
	/** Called when the parent source is disposed. */
	onDispose?(): void
}

/** Authoring surface for one procedural spatial emitter instance. */
export interface SpatialSourceOptions {
	/** Single-buffer source shortcut; bypassed when `layers` is defined. */
	url?: string
	/**
	 * Layered emitter definition. Each layer is decoded/played independently,
	 * then summed through shared spatial/Doppler processing for coherent motion.
	 */
	layers?: LayerConfig[]
	/** Loop state applied to each underlying AudioBufferSourceNode. */
	loop?: boolean
	/** Pre-spatial trim for overall emitter loudness. */
	baseGain?: number
	/** Doppler modulation controls for pitch-shift behavior under relative motion. */
	doppler?: DopplerOptions
	/** Distance attenuation controls for direct-path loudness. */
	distance?: DistanceOptions
	/** Angular localization controls. */
	pan?: PanOptions
	/** Reverberant-field send configuration. */
	reverb?: ReverbOptions
	/** Distance-driven high-frequency air loss for more natural far-field tone. */
	airAbsorption?: AirAbsorptionOptions
	/** Optional source-level plugin chain for procedural runtime modulation. */
	plugins?: SourcePlugin[]
}

/** Shared engine-level configuration applied across all registered sources. */
export interface AudioEngineOptions {
	/** Global output trim applied after dry/wet summation. */
	masterGain?: number
	/** Default wet return gain for the shared reverb bus. */
	defaultReverbWet?: number
	/** Duration of generated fallback impulse response in seconds. */
	defaultReverbLengthSec?: number
	/** Exponential decay shape for generated fallback impulse response. */
	defaultReverbDecay?: number
	/** Required callback supplying current listener kinematics each tick. */
	listenerProvider: ListenerProvider
}

/** Frame payload broadcast to subscribed sources from the engine update loop. */
export interface AudioEngineTick {
	/** Current RAF timestamp in milliseconds. */
	timeMs: number
	/** Inter-frame delta in milliseconds from the render loop. */
	deltaMs: number
	/** Inter-frame delta in seconds; useful for velocity integration and damping. */
	deltaSec: number
	/** Audio clock timestamp used for sample-accurate AudioParam scheduling. */
	audioTime: number
	/** Listener state snapshot used for this processing tick. */
	listener: ListenerState
}
