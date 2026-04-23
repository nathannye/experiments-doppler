import type { DistanceModel } from '../types'
import { clamp } from '../../utils/math'

export function getDistanceGain(
	distance: number,
	model: DistanceModel = 'inverseSquare',
	minDistance = 0.5,
	maxDistance = 100,
): number {
	const safeDistance = Math.max(distance, minDistance)
	const boundedDistance = Math.min(safeDistance, maxDistance)

	switch (model) {
		case 'inverseSquare':
			return 1 / (boundedDistance * boundedDistance)
		case 'inverse':
			return 1 / boundedDistance
		case 'linear':
			return clamp(0, 1, 1 - (boundedDistance - minDistance) / (maxDistance - minDistance))
		default:
			return 1
	}
}
