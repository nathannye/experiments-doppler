export const screen = {
	x: 0,
	y: 0,
	ratio: {
		x: 0,
		y: 0,
	},
	devicePixelRatio: 2,
	glViewSize: {
		w: 0,
		h: 0,
		pixels: 0,
	},
}

export function resizeScreen() {
	if (!window) return
	screen.x = window.innerWidth
	screen.y = window.innerHeight
	screen.ratio.x = screen.x / screen.y
	screen.ratio.y = screen.y / screen.x
	screen.devicePixelRatio = Math.min(window.devicePixelRatio, 2)
}
