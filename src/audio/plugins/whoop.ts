import { clamp } from '../../utils/math'
import type { SourcePlugin, SourcePluginTickContext } from '../types'

export interface WhoopPluginOptions {
	/** Target layer id that receives the whoop modulation. Defaults to 'mid'. */
	layerId?: string
	/** Base whoop repetition rate in Hz. */
	rateHz?: number
	/** Small rate jitter in Hz to avoid robotic repetition. */
	jitterHz?: number
	/** Modulation depth scalar. */
	depth?: number
	/** Distance range where whoop grows in (world units). */
	distanceRange?: [number, number]
	/** Radial velocity magnitude used to normalize receding emphasis. */
	recedingVelocityRef?: number
	/** Lower clamp for resulting gain multiplier. */
	minMultiplier?: number
	/** Upper clamp for resulting gain multiplier. */
	maxMultiplier?: number
	/** AudioParam smoothing time constant for modulation gain updates. */
	smoothingSec?: number
	/**
	 * `tanh` scale for soft-limiting excursion from unity (higher → gentler saturation into min/max band).
	 * Defaults to roughly `Math.max(depth * 0.5, 0.45)`.
	 */
	modulationSoftKnee?: number
}

class WhoopPlugin implements SourcePlugin {
	private options: Required<WhoopPluginOptions>
	private phaseOffset: number
	private smoothedModulation = 1
	private smoothedReceding = 0
	private smoothedDistance = 0

	constructor(options: WhoopPluginOptions = {}) {
		this.options = {
			layerId: options.layerId ?? 'mid',
			rateHz: options.rateHz ?? 2.1,
			jitterHz: options.jitterHz ?? 0.15,
			depth: options.depth ?? 0.32,
			distanceRange: options.distanceRange ?? [250, 4500],
			recedingVelocityRef: options.recedingVelocityRef ?? 140,
			minMultiplier: options.minMultiplier ?? 0.85,
			maxMultiplier: options.maxMultiplier ?? 1.75,
			smoothingSec: options.smoothingSec ?? 0.2,
			modulationSoftKnee: options.modulationSoftKnee ?? 0,
		}
		this.phaseOffset = Math.random() * Math.PI * 2
	}

	onTick(ctx: SourcePluginTickContext): void {
		const layer = ctx.layers.find(
			(candidate) => candidate.id === this.options.layerId,
		)
		if (!layer) {
			return
		}

		const dt = Math.max(1e-4, ctx.tick.deltaSec)
		const envAlpha = 1 - Math.exp(-dt / 1.75)

		const [nearDistance, farDistance] = this.options.distanceRange
		const rawDistanceMix = clamp(
			0,
			1,
			(ctx.distance - nearDistance) / Math.max(1e-3, farDistance - nearDistance),
		)
		this.smoothedDistance += (rawDistanceMix - this.smoothedDistance) * envAlpha
		const distanceMix = this.smoothedDistance

		const rawReceding = clamp(
			0,
			1,
			-ctx.radialVelocity / Math.max(1e-3, this.options.recedingVelocityRef),
		)
		this.smoothedReceding += (rawReceding - this.smoothedReceding) * envAlpha
		const recedingMix = this.smoothedReceding

		const time = ctx.tick.audioTime
		const rateJitter =
			Math.sin(time * 0.37 + this.phaseOffset) * this.options.jitterHz
		const whoopRate = Math.max(0.05, this.options.rateHz + rateJitter)
		const pulse = Math.abs(
			Math.sin((time + this.phaseOffset) * whoopRate * Math.PI * 2),
		)
		const bipolarPulse = pulse * 2 - 1
		const emphasis = distanceMix * (0.2 + recedingMix * 0.8)
		const { minMultiplier, maxMultiplier, depth } = this.options
		const excess = depth * bipolarPulse * emphasis
		const maxUp = maxMultiplier - 1
		const maxDown = 1 - minMultiplier
		const knee =
			this.options.modulationSoftKnee > 0
				? this.options.modulationSoftKnee
				: Math.max(depth * 0.5, 0.45)
		const shaped =
			excess >= 0
				? maxUp * Math.tanh(excess / knee)
				: -maxDown * Math.tanh(-excess / knee)
		const targetModulation = 1 + shaped

		const modAlpha = 1 - Math.exp(-dt / Math.max(1e-4, this.options.smoothingSec))
		this.smoothedModulation +=
			(targetModulation - this.smoothedModulation) * modAlpha

		layer.gainNode.gain.value = layer.computedGain * this.smoothedModulation
	}
}

export function createWhoopPlugin(options?: WhoopPluginOptions): SourcePlugin {
	return new WhoopPlugin(options)
}
