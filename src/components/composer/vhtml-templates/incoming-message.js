function displayAddress({ name, address }) {
	return name || address;
}

export default function incomingMessage({ date, from, body }) {
	return `<span id="OLK_SRC_BODY_SECTION">
			On ${date} <a href="mailto:${from.address.replace(/"/g, '&quot;')}">${displayAddress(
		from
	)}</a> wrote:
			<br /><br />
			<blockquote style="margin:0 0 0 .8em; border-left:1px #ccc solid; padding-left:1em">
				${body}
			</blockquote>
		</span>
	`
		.trim()
		.replace(/(^|\n)\t+/g, '');
}
