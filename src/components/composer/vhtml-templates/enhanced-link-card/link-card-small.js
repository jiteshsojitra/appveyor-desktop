import { clean } from '../helpers';
import linkCardOptions from './link-card-options';
import { getSafeHtmlId } from '../../../../lib/html-viewer';
import { CARD_SIZE } from './link-card';

export default function EnhancedLinkCardSmall(
	{ url, title, domainStyles, uid, image },
	isFooterCard = false,
	restoreToSize = CARD_SIZE.SMALL
) {
	const cardDisplayType = isFooterCard ? 'display: inline-block;' : 'display: block;';
	let cardContentContainerStyle = 'width: 254px;';
	let extraHeadingStyles = `
		margin: 0 0 4px 10px;
		line-height: 74px;
		height: 74px;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	`;

	if (domainStyles && domainStyles.logo) {
		cardContentContainerStyle = 'width: 254px; padding-top: 8px; padding-bottom: 7px;';
		extraHeadingStyles = `
			line-height: 1.17;
			margin: 8px 0 4px 10px;
			white-space: nowrap;
			text-overflow: ellipsis;
			overflow: hidden;
		`;
	}

	if (image && image.small) {
		cardContentContainerStyle = 'width: 204px;';
		extraHeadingStyles = `
			line-height: 1.17;
			margin: 8px 0 4px 10px;
		`;
	}

	return clean(`
		<div data-safe-html="${getSafeHtmlId()}"
			data-url="${url}"
			data-restore-card-size="${restoreToSize}"
			data-current-card-size="${CARD_SIZE.SMALL}"
			embedded-card
			id="enhanced-link-card-${uid}"
			style="${cardDisplayType}"
			uneditable
		>
			<div
				enhanced-link-card
				embedded-link-card
				style="background-color: #fff;
				border: 1px solid #e0e4e9;
				border-right: 3px solid ${domainStyles.color};
				width: 288px;"
			>
				<a target="_blank" style="text-decoration: none;overflow: hidden;" href="${url}" rel="noopener noreferrer">
					${
						image && image.small
							? `
						<div style="width: 80px;
							text-align: center;
							display: inline-block;
							vertical-align: middle;
							height: 80px;
							overflow: hidden;">
							<img
								style="height: 100%;
								vertical-align: middle;"
								src=${image.small} />
						</div>`
							: ''
					}
					<div style="
						${cardContentContainerStyle}
						display: inline-block; vertical-align: middle;
						">
						${
							domainStyles && domainStyles.logo
								? `<img style="margin-top: 4px;
								margin-left: 10px; height: 24px; width: 24px;"
								src=${domainStyles.logo} />`
								: ''
						}
						<h2 style="
							color: #000000;
							font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
							font-size: 13px;
							word-wrap: break-word;
							${extraHeadingStyles}
							">
							${title}
						</h2>
					</div>
				</a>
				<div action-item-wrapper>
					${linkCardOptions({ image, cardSize: CARD_SIZE.SMALL, cardId: uid }, isFooterCard)}
					<button class="square-btn" data-card-id='${uid}' button-remove-card="true" type="button">
						&times;
					</button>
				</div>
			</div>
		</div>
	`);
}
