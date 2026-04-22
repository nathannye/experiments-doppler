export const onClick = (element: HTMLElement, callback: () => void) => {
	element.addEventListener('click', callback)
}
