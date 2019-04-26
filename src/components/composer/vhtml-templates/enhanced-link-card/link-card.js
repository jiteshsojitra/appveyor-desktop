import enhancedLinkCardSmall from './link-card-small';
import enhancedLinkCardMediumAndLarge from './link-card-medium-and-large';

export const CARD_LOCATION = {
	BODY: 'BODY',
	FOOTER: 'FOOTER'
};

export const CARD_SIZE = {
	SMALL: 'SMALL',
	MEDIUM: 'MEDIUM',
	LARGE: 'LARGE'
};

export default function enhancedLinkCard(
	{ url, title, domainStyles, description, image, uid },
	{ cardSize = CARD_SIZE.MEDIUM, cardLocation = CARD_LOCATION.BODY, restoreToSize }
) {
	if (cardSize === CARD_SIZE.SMALL || cardLocation === CARD_LOCATION.FOOTER) {
		return enhancedLinkCardSmall(
			{ url, title, domainStyles, image, uid },
			cardLocation === CARD_LOCATION.FOOTER,
			restoreToSize
		);
	}

	return enhancedLinkCardMediumAndLarge({
		url,
		title,
		domainStyles,
		description,
		image,
		uid,
		cardSize
	});
}
