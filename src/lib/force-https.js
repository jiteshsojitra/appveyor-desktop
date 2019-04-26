export default function forceHTTPS() {
	if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
		window.location.href = `https:${window.location.href.substring(
			window.location.protocol.length
		)}`;
	}
}
