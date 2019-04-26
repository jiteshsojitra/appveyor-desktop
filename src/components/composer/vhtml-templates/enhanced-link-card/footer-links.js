import { clean } from '../helpers';
import { getSafeHtmlId } from '../../../../lib/html-viewer';

export default function FooterLinks(cardContent) {
	return clean(`
		<div id="footerLinksWrapper" data-safe-html="${getSafeHtmlId()}">
			<h3 style="font-size:14px;
				font-weight:400;
				font-family:'Helvetica Neue','Segoe UI', Helvetica,Arial,'Lucida Grande',sans-serif;
				color:#454545;
				line-height:14px;
				text-shadow:1px 1px 0 rgb(255, 255, 255);
				margin:0;
				padding:0 0 11px 0;">
			Links in the message
			</h3>
			<div id="footerLinks">
				${cardContent || ''}
			</div>
		</div>
		
	`);
}
