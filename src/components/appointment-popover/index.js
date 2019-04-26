import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import cx from 'classnames';
import get from 'lodash-es/get';
import { Button, Icon } from '@zimbra/blocks';
import colors from '../../constants/colors';
import CloseButton from '../close-button';
import { formatDayRange } from '../../utils/date/format-range';

import s from './style.less';

export default class AppointmentPopover extends Component {
	render({ appointment, calendar, searchResult, onClose }) {
		const item = searchResult || appointment;
		const start = get(item, 'instances.0.start');
		const end = start ? start + searchResult.duration : null;
		const excerpt = get(searchResult, 'excerpt');

		return (
			<div>
				<CloseButton class={s.closeButton} onClick={onClose} />
				<div class={s.container}>
					<div class={s.mainInfo}>
						<div class={cx(s.infoLine, s.eventName)}>{item.name}</div>
						{item.loc && (
							<div class={s.infoLine}>
								<Text id="prepositions.at" />{' '}
								<a
									target={'_blank'}
									href={`http://www.google.com/maps?q=${encodeURIComponent(item.loc)}`}
								>
									{item.loc}
								</a>
							</div>
						)}
						{start && (
							<div class={cx(s.infoLine, s.alignCenter)}>
								<div>{formatDayRange(start, end)}</div>
								{item.alarm === true && <Icon class={s.alarm} name="bell" size="xs" />}
								{searchResult.recur && <div class={s.repeatIcon} />}
							</div>
						)}
					</div>
					<div class={s.moreInfo}>
						{calendar && (
							<div class={cx(s.infoLine, s.alignCenter)}>
								<div
									class={s.colorIcon}
									style={{
										backgroundColor: calendar ? colors[calendar.color] : colors['0']
									}}
								/>
								<div>{calendar.name}</div>
							</div>
						)}
						{excerpt && <div class={cx(s.infoLine, s.eventDesc)}>{excerpt}</div>}
					</div>
					<div class={s.buttonContainer}>
						<Button type="button" class={s.button} onClick={this.handleEditEvent}>
							<Text id="buttons.edit" />
						</Button>
						<Button type="button" class={s.button} onClick={this.handleDeleteEvent}>
							<Text id="buttons.delete" />
						</Button>
					</div>
				</div>
			</div>
		);
	}
}
