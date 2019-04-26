function find(document, selector) {
	return Array.prototype.slice.call(document.querySelectorAll(selector));
}

export default function quoteToggle(document) {
	const all = find(
			document,
			'#zwchr, .gmail_quote, .gmail_extra, .yahoo-quoted-begin, #OLK_SRC_BODY_SECTION, body > blockquote, body > * > blockquote'
		),
		first = document.body.firstElementChild;

	if (first) {
		const hr = find(document, 'body > hr, body > ' + (first.nodeName || 'div') + ' > hr');
		for (let i = 0; i < hr.length; i++) {
			const p = hr[i];
			if (p.nextSibling && p.nextSibling.textContent.match(/^[\n\s]*From:/g)) {
				all.push(p);
			}
		}
	}

	const rootNodes = find(document, '[style]');
	for (let i = 0; i < rootNodes.length; i++) {
		let el = rootNodes[i];
		if (
			el.style.borderTop &&
			el.style.borderTop.match(/\bsolid\b/i) &&
			el.textContent.match(/^[\n\s]*From:/g)
		) {
			while (!el.previousSibling && el.parentNode) {
				el = el.parentNode;
			}
			all.push(el);
		}
	}

	let quoted = all.sort((a, b) => (a.compareDocumentPosition(b) & 2 ? 1 : -1))[0];

	if (quoted) {
		// Also hide "lead-in" ("On May 5th, so and so wrote:")
		const prev = quoted.previousSibling;
		if (
			prev &&
			prev.textContent.match(/^(\s*On \w.*?\sat\s.*?wrote:\s*$|\s*From: [\s\S]+\n\s*Sent: )/i)
		) {
			quoted = prev;
		}

		let p = quoted,
			next;
		quoted = document.createElement('span');
		quoted.id = 'OLK_SRC_BODY_SECTION';
		p.parentNode.insertBefore(quoted, p);
		do {
			next = p.nextSibling;
			quoted.appendChild(p);
		} while ((p = next));
	}

	if (quoted) {
		const toggle = document.createElement('input');
		toggle.type = 'checkbox';
		toggle.id = '__zm_toggle__';
		quoted.parentNode.insertBefore(toggle, quoted);

		// when used as a processor for `lib/sanitize.js`, a returned function is run *after* attribute removal.
		return () => {
			quoted.id = 'OLK_SRC_BODY_SECTION';
			toggle.id = '__zm_toggle__';
		};
	}
}
