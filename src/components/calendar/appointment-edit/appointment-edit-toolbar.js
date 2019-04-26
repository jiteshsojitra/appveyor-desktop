import { h } from 'preact';

import Toolbar from '../../toolbar';
import { Text } from 'preact-i18n';
import { Button } from '@zimbra/blocks';
import s from './style.less';
import cx from 'classnames';

export default function AppointmentEditToolbar({ isMobileActive, footerClass, ...props }) {
	const items = (
		<AppointmentEditToolbarItems
			class={cx(isMobileActive ? s.toolbarAction : s.footer, footerClass)}
			{...props}
		/>
	);
	return isMobileActive ? <Toolbar>{items}</Toolbar> : items;
}

function AppointmentEditToolbarItems({ onSave, onCancel, isForwardInvite, ...props }) {
	return (
		<div {...props}>
			<Button
				class={s.addEventAction}
				styleType="primary"
				brand="primary"
				disabled={!onSave}
				onClick={onSave}
			>
				<Text id={`buttons.${isForwardInvite ? 'send' : 'save'}`} />
			</Button>
			<Button class={s.addEventAction} disabled={!onCancel} onClick={onCancel}>
				<Text id="buttons.cancel" />
			</Button>
		</div>
	);
}
