export const getAudioBuffer = async (filePath: string, ctx: AudioContext) => {
	const response = await fetch(filePath)
	const arrayBuffer = await response.arrayBuffer()
	const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
	return audioBuffer
}
