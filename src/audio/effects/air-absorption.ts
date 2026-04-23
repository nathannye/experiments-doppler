import { clamp } from '../../utils/math'

const EPSILON = 0.0001

export function getAirAbsorptionCutoff(
	distance: number,
	minDistance = 1,
	maxDistance = 100,
	minCutoffHz = 1200,
	maxCutoffHz = 18000,
	curve = 1.25,
): number {
	const safeMinDistance = Math.max(EPSILON, minDistance)
	const safeMaxDistance = Math.max(safeMinDistance + EPSILON, maxDistance)
	const safeMinCutoff = Math.max(50, Math.min(minCutoffHz, maxCutoffHz))
	const safeMaxCutoff = Math.max(safeMinCutoff + 1, maxCutoffHz)

	const normalized = clamp(
		0,
		1,
		(distance - safeMinDistance) / (safeMaxDistance - safeMinDistance),
	)
	const shaped = Math.pow(normalized, Math.max(EPSILON, curve))

	// Interpolate in log-frequency space for perceptually smoother rolloff.
	const logCutoff =
		Math.log(safeMaxCutoff) + shaped * (Math.log(safeMinCutoff) - Math.log(safeMaxCutoff))
	return Math.exp(logCutoff)
}
