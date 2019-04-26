import { h } from 'preact';
import { Button, Icon, ClickOutsideDetector } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import noop from 'lodash-es/noop';
import cx from 'classnames';

import style from './style.less';

export default function InlineModalDialog({
	closeOnClickOutside = true,
	dialogClassName,
	wrapperClassName,
	innerClassName,
	toolbarClassName,
	title,
	titleClass,
	actionLabel,
	secondaryActionLabel,
	cancelLabel,
	onAction,
	showActionBtn = true,
	onClose,
	showCloseBtn = true,
	children,
	disablePrimary,
	showSecondaryAction = true,
	onSecondaryAction,
	disableSecondary,
	error
}) {
	const actions = [
		showActionBtn && onAction && (
			<Button
				class={style.noLeft}
				onClick={onAction}
				styleType="primary"
				disabled={disablePrimary}
				brand="primary"
			>
				<Text id={actionLabel || 'buttons.ok'}>{actionLabel}</Text>
			</Button>
		),
		showSecondaryAction && onSecondaryAction && (
			<Button onClick={onSecondaryAction} disabled={disableSecondary}>
				<Text id={secondaryActionLabel || 'buttons.ok'}>{secondaryActionLabel}</Text>
			</Button>
		),
		showCloseBtn && onClose && (
			<Button onClick={onClose}>
				<Text id={cancelLabel || 'buttons.cancel'}>{cancelLabel}</Text>
			</Button>
		)
	];
	return (
		<div class={dialogClassName}>
			<div class={cx(style.wrapper, wrapperClassName)}>
				<ClickOutsideDetector onClickOutside={closeOnClickOutside ? onClose : noop}>
					<div class={cx(style.inner, innerClassName)}>
						<div class={cx(style.toolbar, style.hideSmUp, toolbarClassName)}>{actions}</div>
						<div class={cx(style.header, titleClass)}>
							{typeof title === 'string' ? <Text id={title}>{title}</Text> : title}
							<Icon class={style.close} name="close" size="md" onClick={onClose} />
						</div>
						{error && <div class={cx(style.error)}>{error}</div>}
						<div class={style.contentWrapper}>{children}</div>
						<div class={cx(style.footer, style.hideXsDown)}>{actions}</div>
					</div>
				</ClickOutsideDetector>
			</div>
		</div>
	);
}
