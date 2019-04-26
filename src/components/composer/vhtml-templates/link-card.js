import { clean } from './helpers';
import { getSafeHtmlId } from '../../../lib/html-viewer';

export default function LinkCard({ href, title, description }) {
	return clean(`
		<div data-safe-html="${getSafeHtmlId()}" embedded-card uneditable>
			<div
				embedded-link-card
				style="border-radius: 3px;
					background-color: #ffffff;
					display: block;
					width: 500px;
					padding: 16px;
					box-shadow: 0 1px 2px 0 #ccc;
					border: solid 1px #dfdfdf;"
			>
				<a target="_blank" style="text-decoration: none;" href="${href}" rel="noopener noreferrer">
					<h5
						style="color: #454545;
							font-size: 16px;
							font-weight: 500;
							margin: 0 0 15px;"
					>
						${title}
					</h5>
					<p
						style="font-size: 13px;
							line-height: 1.54;
							margin-top: 0;
							margin-bottom: 20px;
							color: #999;"
					>
						${description}
					</p>
					<span
						style="font-size: 13px;
							line-height: 1.54;
							color: #999;"
					>
						view on ${href}
					</span>
				</a>
				<div action-item-wrapper>
					<button class="square-btn" button-remove-card="true" type="button">
						&times;
					</button>
				</div>
			</div>
		</div>
	`);
}
