import { h } from 'preact';
import { Icon } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import moment from 'moment';
import cx from 'classnames';

import s from './style.less';

export default function Header({ value, onRefresh, onPrevDay, onNextDay, onClose }) {
	return (
		<div class={s.header}>
			<div class={s.headerControls}>
				<Icon class={cx(s.icon, s.angleIcon)} name="angle-left" size="sm" onClick={onPrevDay} />
				<Icon class={cx(s.icon, s.angleIcon)} name="angle-right" size="sm" onClick={onNextDay} />
				<div class={s.title}>
					<Text
						id="calendar.editModal.availability.title"
						fields={{
							date: moment(value).format('dddd, MMMM D, Y')
						}}
					/>
				</div>
				<Icon class={cx(s.icon, s.refreshIcon)} name="refresh" size="md" onClick={onRefresh} />
				<Icon class={s.icon} name="close" size="md" onClick={onClose} />
			</div>
			<Text id="calendar.editModal.availability.subtitle" />
		</div>
	);
}
