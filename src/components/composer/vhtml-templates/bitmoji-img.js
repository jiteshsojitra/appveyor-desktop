import { clean } from './helpers';
import { getSafeHtmlId } from '../../../lib/html-viewer';

export default function BitmojiImg({ url, name }) {
	return clean(`
		<img data-safe-html="${getSafeHtmlId()}" src="${url}" alt="${name}" bitmoji>
	`);
}
