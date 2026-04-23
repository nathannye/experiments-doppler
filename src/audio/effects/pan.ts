import type { Vector3 } from 'three'
import { clamp } from '../../utils/math'

export function getStereoPan(
	sourcePosition: Vector3,
	listenerPosition: Vector3,
	listenerRight: Vector3,
	listenerForward: Vector3,
): number {
	const toSource = sourcePosition.clone().sub(listenerPosition)
	if (toSource.lengthSq() === 0) {
		return 0
	}

	toSource.normalize()

	const pan = clamp(-1, 1, toSource.dot(listenerRight))
	const frontness = Math.abs(toSource.dot(listenerForward))
	return clamp(-1, 1, pan * (1 - frontness))
}
