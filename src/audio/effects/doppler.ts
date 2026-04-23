import { clamp, dopplerPlaybackRate } from '../../utils/math'

export function getDopplerPlaybackRate(
	radialVelocity: number,
	observerRadialVelocity: number,
	depth = 1,
	rateClamp: [number, number] = [0.7, 1.3],
): number {
	const scaledSourceVelocity = radialVelocity * depth
	const scaledObserverVelocity = observerRadialVelocity * depth
	const ratio = dopplerPlaybackRate(scaledObserverVelocity, scaledSourceVelocity)
	return clamp(rateClamp[0], rateClamp[1], ratio)
}
