import type { Vector3 } from 'three'

export type DistanceModel = 'inverseSquare' | 'inverse' | 'linear'
export type PanMode = 'stereo' | 'hrtf3d' | 'equalpower3d'

export interface ListenerState {
	position: Vector3
	forward: Vector3
	right: Vector3
	velocity?: Vector3
}

export type ListenerProvider = () => ListenerState

export interface SourceUpdateInput {
	position: Vector3
	velocity: Vector3
}

export interface DopplerOptions {
	enabled?: boolean
	smoothingSec?: number
	rateClamp?: [number, number]
	depth?: number
}

export interface DistanceOptions {
	enabled?: boolean
	model?: DistanceModel
	minDistance?: number
	maxDistance?: number
}

export interface PanOptions {
	enabled?: boolean
	mode?: PanMode
	smoothing?: number
}

export interface ReverbOptions {
	enabled?: boolean
	wet?: number
	wetByDistance?: boolean
	impulseUrlOverride?: string
}

export interface LayerFilterOptions {
	type: BiquadFilterType
	frequency: number
	Q?: number
}

export interface LayerConfig {
	id: string
	url: string
	gain?: number
	detuneCents?: number
	filter?: LayerFilterOptions
	dopplerDepth?: number
	distanceDepth?: number
	panDepth?: number
	reverbSend?: number
}

export interface SpatialSourceOptions {
	url?: string
	layers?: LayerConfig[]
	loop?: boolean
	baseGain?: number
	doppler?: DopplerOptions
	distance?: DistanceOptions
	pan?: PanOptions
	reverb?: ReverbOptions
}

export interface AudioEngineOptions {
	masterGain?: number
	defaultReverbWet?: number
	defaultReverbLengthSec?: number
	defaultReverbDecay?: number
	listenerProvider: ListenerProvider
}

export interface AudioEngineTick {
	timeMs: number
	deltaMs: number
	deltaSec: number
	audioTime: number
	listener: ListenerState
}
