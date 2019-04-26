import { clean } from './helpers';
import { getSafeHtmlId } from '../../../lib/html-viewer';

export default function EmojiImg({ contentId, url, name }) {
	return clean(`
		<img data-safe-html="${getSafeHtmlId()}" data-cid="${contentId}" src="${url}" alt="${name}" emoji>
	`);
}
