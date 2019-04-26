import { clean } from './helpers';
import { getSafeHtmlId } from '../../../lib/html-viewer';

export default function SignatureCard(signatureContent) {
	return clean(`<div data-safe-html="${getSafeHtmlId()}" data-safe-id="signature-card-${Date.now()}">
			<div>${signatureContent}<br/></div>
		</div>
	`);
}
