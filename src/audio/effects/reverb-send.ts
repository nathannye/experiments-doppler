import { clamp } from '../../utils/math'

export function getReverbWetGain(
	baseWet: number,
	distance: number,
	wetByDistance = false,
	maxDistance = 100,
): number {
	if (!wetByDistance) {
		return clamp(0, 1, baseWet)
	}

	const normalized = clamp(0, 1, distance / maxDistance)
	return clamp(0, 1, baseWet * (0.5 + normalized * 0.5))
}
