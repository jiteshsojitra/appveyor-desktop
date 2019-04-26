import { clean } from './helpers';
import { getSafeHtmlId } from '../../../lib/html-viewer';

export default function Img({ contentId, url, name }) {
	return clean(`
		<div data-safe-html="${getSafeHtmlId()}" uneditable>
			<div embedded-image collapsed>
				<img data-cid="${contentId}" src="${url}" ${
		name && name !== 'undefined' ? ` alt="${name}"` : ''
	} style="width: 100%; max-width: 320px;"></img>
				<div embedded-image-overlay>
					<div>
						<button class="square-btn" button-toggle-shrink-image>⤢</button>
						&nbsp;
						<button class="square-btn" button-remove-image>×</button>
					</div>
				</div>
			</div>
		</div>
	`);
}
