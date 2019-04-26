export function generateCommand(icon, command, type, extra = {}) {
	return { icon, command, type, ...extra };
}
