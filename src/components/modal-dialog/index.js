import { h } from 'preact';
import { Button, Spinner, ModalDialog as ModalDialogBlock } from '@zimbra/blocks';
import ErrorAlert from '../error-alert';
import { Text } from 'preact-i18n';
import cx from 'classnames';
import CloseButton from '../close-button';
import style from './style';

function ModalDialog({
	scrollable = false,
	cancelButton = true,
	title,
	pending,
	buttons,
	actionLabel,
	cancelLabel,
	onAction,
	onClose,
	onClickOutside,
	children,
	disablePrimary,
	disableEscape,
	disableOutsideClick,
	contentClass,
	supplementalFooter,
	error,
	header = true,
	footer = true,
	innerClass,
	headerClass,
	footerClass,
	...props
}) {
	// these two prop names are interchangable
	onClose = onClose || onClickOutside;

	return (
		<ModalDialogBlock
			overlayClass={style.backdrop}
			class={cx(style.dialog, scrollable && style.scrollable, props.class)}
			onClickOutside={onClose}
			disableEscape={disableEscape}
			disableOutsideClick={disableOutsideClick}
		>
			<div class={cx(style.inner, innerClass)}>
				{header && (
					<header class={cx(style.header, headerClass)}>
						<h2>{typeof title === 'string' ? <Text id={title}>{title}</Text> : title}</h2>
						<CloseButton onClick={onClose} class={style.actionButton} />
					</header>
				)}

				<div class={cx(style.content, contentClass)} disabled={pending}>
					{error && <ErrorAlert>{error}</ErrorAlert>}
					{children}
				</div>

				{footer && (
					<footer class={cx(style.footer, footerClass)}>
						{buttons !== false &&
							(buttons || (
								<Button
									styleType="primary"
									brand="primary"
									onClick={onAction}
									disabled={pending || disablePrimary}
								>
									<Text id={actionLabel}>{actionLabel}</Text>
								</Button>
							))}

						{cancelButton !== false && (
							<Button onClick={onClose}>
								<Text id={cancelLabel || (buttons && buttons.cancel) || 'buttons.cancel'}>
									{cancelLabel}
								</Text>
							</Button>
						)}

						{supplementalFooter}
					</footer>
				)}

				{pending && <Spinner class={style.spinner} />}
			</div>
		</ModalDialogBlock>
	);
}

ModalDialog.defaultProps = {
	actionLabel: 'buttons.ok'
};

export default ModalDialog;
