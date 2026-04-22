import { Vector3 } from 'three'

export const distanceBetween = (pos1: Vector3, pos2: Vector3) => {
	const p1 = new Vector3(pos1.x, pos1.y, pos1.z)
	const p2 = new Vector3(pos2.x, pos2.y, pos2.z)
	return p1.distanceTo(p2)
}
