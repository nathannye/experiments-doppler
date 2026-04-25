import { clamp } from '../../utils/math'
import type { SourcePlugin, SourcePluginTickContext } from '../types'

export interface EngineCharacterPluginOptions {
	/** Layer id that receives near-field aggression shaping. */
	layerId?: string
	/** Distance range where aggression fades from strong (near) to weak (far). */
	distanceRange?: [number, number]
	/** Positive radial velocity used to normalize approach intensity. */
	approachVelocityRef?: number
	/** Maximum gain boost applied at strong near/approach conditions. */
	boost?: number
	/** Minimum multiplier clamp. */
	minMultiplier?: number
	/** Maximum multiplier clamp. */
	maxMultiplier?: number
}

class EngineCharacterPlugin implements SourcePlugin {
	private options: Required<EngineCharacterPluginOptions>

	constructor(options: EngineCharacterPluginOptions = {}) {
		this.options = {
			layerId: options.layerId ?? 'high',
			distanceRange: options.distanceRange ?? [120, 1800],
			approachVelocityRef: options.approachVelocityRef ?? 140,
			boost: options.boost ?? 1.1,
			minMultiplier: options.minMultiplier ?? 0.8,
			maxMultiplier: options.maxMultiplier ?? 2.6,
		}
	}

	onTick(ctx: SourcePluginTickContext): void {
		const layer = ctx.layers.find(
			(candidate) => candidate.id === this.options.layerId,
		)
		if (!layer) {
			return
		}

		const [nearDistance, farDistance] = this.options.distanceRange
		const distanceLerp = clamp(
			0,
			1,
			(ctx.distance - nearDistance) / Math.max(1e-3, farDistance - nearDistance),
		)
		const nearMix = 1 - distanceLerp
		const approachMix = clamp(
			0,
			1,
			ctx.radialVelocity / Math.max(1e-3, this.options.approachVelocityRef),
		)
		const aggression = nearMix * approachMix
		const modulation = 1 + this.options.boost * aggression
		const clampedModulation = clamp(
			this.options.minMultiplier,
			this.options.maxMultiplier,
			modulation,
		)

		layer.gainNode.gain.value = layer.computedGain * clampedModulation
	}
}

export function createEngineCharacterPlugin(
	options?: EngineCharacterPluginOptions,
): SourcePlugin {
	return new EngineCharacterPlugin(options)
}
