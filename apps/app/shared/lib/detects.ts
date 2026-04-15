export const isMobile = (): boolean => {
	const ua = navigator.userAgent.toLowerCase();

	const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
	if (!isMobileUA) return false;

	try {
		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

		if (gl) {
			const debugInfo = (gl as any).getExtension("WEBGL_debug_renderer_info");
			// @ts-expect-error
			const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_ID).toLowerCase();

			const isDesktopGPU = /nvidia|intel|amd|swiftshader|microsoft/i.test(renderer);
			if (isDesktopGPU) return false;
		}
	} catch (e) {}

	const platform = (navigator as any).platform?.toLowerCase() || "";
	if (/win32|macintel/i.test(platform)) return false;

	return true;
};
