import { clean } from '../helpers';
import linkCardOptions from './link-card-options';
import { getSafeHtmlId } from '../../../../lib/html-viewer';

import { CARD_SIZE } from './link-card';

export default function EnhancedLinkCardMediumAndLarge({
	url,
	title,
	domainStyles,
	description,
	image,
	uid,
	cardSize
}) {
	let maxWidth = 400;
	let logoDimension = 32;
	let backgroundImageContainerHeight = '200px';
	let backgroundImageUrl = image && image.medium;

	if (cardSize === CARD_SIZE.LARGE) {
		maxWidth = 800;
		logoDimension = 48;
		backgroundImageContainerHeight = '280px';
		backgroundImageUrl = image && image.large;
	}

	let cardContentContainerStyle = 'width: 100%';
	let innerContentWrapperStyle = 'padding: 16px 12px;width: 99%';
	const hasHeroImage = image && image.medium;
	const hasLogo = domainStyles && domainStyles.logo;

	if (hasHeroImage) {
		cardContentContainerStyle = 'margin: -40px 10px 0 10px;';
	}

	if (!hasLogo) {
		innerContentWrapperStyle = 'padding: 18px 20px;';
	}

	return clean(`
		<div
			data-safe-html="${getSafeHtmlId()}"
			data-current-card-size="${cardSize}"
			data-restore-card-size="${cardSize}"
			data-url="${url}"
			id="enhanced-link-card-${uid}"
			embedded-card
			uneditable
		>
			<div style="max-width: ${maxWidth}px;">
				<a target="_blank" style="text-decoration: none;overflow: hidden;" href="${url}" rel="noopener noreferrer">
					<div enhanced-link-card embedded-link-card style="position: relative; width: 100%;background-color: #fff;">
						<table style="width: 100%;border-collapse: collapse;">
							<tbody>
								${
									!backgroundImageUrl
										? ''
										: `
									<tr>
										<td background="${backgroundImageUrl}"
											style="height: ${backgroundImageContainerHeight};
											text-align: center;
											background-image: url('${backgroundImageUrl}');
											background-color: transparent;
											background-position: center center;
											background-size: cover;
											background-repeat: no-repeat;
											display: block;
											overflow: hidden;
											padding: 0;
											position: relative;"
										></td>
									</tr>
								`.trim()
								}
								<tr>
									<td>
										<table
											id="enhanced-link-card-table-${uid}"
											style="background-color: #fff;
												border-collapse: collapse;
												border: 1px solid #e0e4e9;
												border-bottom: 3px solid ${domainStyles.color};
												display: block;
												position: relative;
												vertical-align: middle;
												${cardContentContainerStyle}"
										>
											<tbody>
												<tr>
													${
														domainStyles && domainStyles.logo
															? `<td style="vertical-align: top;
															padding:20px 0 16px 12px;">
															<img style="
																height: ${logoDimension}px;
																width: ${logoDimension}px;"
																src=${domainStyles.logo} />
														</td>`
															: ''
													}
													<td style="
														vertical-align: middle;
														${innerContentWrapperStyle}
													">
														<h2 style="
															color: #000000;
															font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
															font-size: 16px;
															margin: 0;
															word-wrap: break-word;
															">
															${title}
														</h2>
														${
															description
																? `<p style="color: #535353; font-size: 11px; line-height: 1.27;margin: 4px 0 0;">${description}</p>`
																: ''
														}
													</td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
							</tbody>
						</table>
						<div action-item-wrapper>
							${linkCardOptions({ image, cardSize, cardId: uid })}
							<button class="square-btn"  data-card-id='${uid}' button-remove-card="true" type="button">
								&times;
							</button>
						</div>
					</div>
				</a>
			</div>
		</div>
	`);
}
