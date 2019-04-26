/* eslint preact-i18n/no-text-as-children: [off] */
import { h, Component } from 'preact';
import cx from 'classnames';
import ZimletSlot from '../zimlet-slot';
import style from './style';
import withMediaQuery from '../../enhancers/with-media-query';
import {
	minWidth,
	screenLg,
	maxWidth,
	screenXsMax,
	screenSm,
	screenSmMax
} from '../../constants/breakpoints';

@withMediaQuery(minWidth(screenLg), 'matchesScreenLg')
export class RightSideAdSlot extends Component {
	render({ matchesScreenLg }) {
		return (
			matchesScreenLg && (
				<div class={style.rightAdZimletSlot}>
					<ZimletSlot name="adSlot-300-250-top" props class={style.adSlotHorizontal} />
					<ZimletSlot name="adSlot-300-250-bottom" props class={style.adSlotHorizontal} />
					<ZimletSlot name="adSlot-news" props class={style.newsSlot} />
					<ZimletSlot name="adSlot-160-600" props class={style.adSlotVertical} />
				</div>
			)
		);
	}
}

@withMediaQuery(minWidth(screenLg), 'matchesScreenLg')
export class LeftSideAdSlot extends Component {
	render({ matchesScreenLg }) {
		return (
			matchesScreenLg && (
				<div class={style.leftAdZimletSlot}>
					<ZimletSlot
						name="adSlot-left-180-150"
						props
						class={cx(style.adSlotLeft, style.adSlotLeftMedium)}
					/>
					<ZimletSlot
						name="adSlot-left-120-90"
						props
						class={cx(style.adSlotLeft, style.adSlotLeftSmall)}
					/>
				</div>
			)
		);
	}
}
@withMediaQuery(maxWidth(screenXsMax), 'matchesScreenXsMax')
@withMediaQuery(minWidth(screenSm), 'matchesScreenSmMin')
@withMediaQuery(maxWidth(screenSmMax), 'matchesScreenSmMax')
export class BottomSideAdSlots extends Component {
	render({ matchesScreenXsMax, matchesScreenSmMax, matchesScreenSmMin }) {
		return (
			<div class={style.zimletAdWrapper}>
				{matchesScreenXsMax ? (
					<ZimletSlot name="adSlot-adhesion-320-50" props class={style.adSlotBottomXs} />
				) : (
					matchesScreenSmMin &&
					matchesScreenSmMax && (
						<ZimletSlot name="adSlot-adhesion-728-90" props class={style.adSlotBottomMd} />
					)
				)}
			</div>
		);
	}
}
