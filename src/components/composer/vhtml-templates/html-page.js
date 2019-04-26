export default function htmlPage({ stylesheet, body }) {
	return `
<!DOCTYPE html>
<html>
	<head>
		${stylesheet ? `<style>${stylesheet}</style>` : ''}
	</head>
	<body>${body}</body>
</html>
	`.trim();
}
