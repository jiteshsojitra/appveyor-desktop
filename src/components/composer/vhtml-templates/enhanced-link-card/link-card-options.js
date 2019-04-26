import { clean } from '../helpers';
import { CARD_SIZE } from './link-card';
export default function linkCardOptions({ image, cardSize, cardId }, isFooterCard = false) {
	return clean(`
		${
			isFooterCard
				? `
			<button button-move-inline type="button" class="square-btn"  data-card-id='${cardId}'>
				Move inline
			</button>
		`
				: ''
		}
		${
			!isFooterCard
				? `
			<div button-resize-card-options class="square-btn">
				⌄
				<div class="dropdown-menu">
					<ul class="dropdown-menu-section">
						<li>
							<button button-card-size-small data-card-id='${cardId}'>
								${cardSize === CARD_SIZE.SMALL ? `<span>✔</span>` : ''}
								Small
							</button>
						</li>
						<li>
							<button button-card-size-medium data-card-id='${cardId}'>
								${cardSize === CARD_SIZE.MEDIUM ? `<span>✔</span>` : ''}
								Medium
							</button>
						</li>
						${
							image && image.large
								? `
							<li>
								<button button-card-size-large data-card-id='${cardId}'>
									${cardSize === CARD_SIZE.LARGE ? `<span>✔</span>` : ''}
									Large
								</button>
							</li>
						`
								: ''
						}
					</ul>
					<ul class="dropdown-menu-section">
						<li>
							<button button-move-card-to-footer  data-card-id='${cardId}'>
								Move to bottom
							</button>
						</li>
					</ul>
				</div>
			</div>
		`
				: ''
		}
	`);
}
