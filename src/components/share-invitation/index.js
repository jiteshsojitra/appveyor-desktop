import { h } from 'preact';
import { Text } from 'preact-i18n';
import { Button } from '@zimbra/blocks';
import withTrashMessage from '../../graphql-decorators/trash-message';
import { withHandlers, compose } from 'recompose';

export default compose(
	withTrashMessage({ name: 'onDecline' }),
	withHandlers({
		onDecline: ({ onDecline, message }) => () => onDecline(message)
	})
)(ShareInvitation);

function ShareInvitation({ onAccept, onDecline }) {
	return (
		<div>
			<Button styleType="primary" brand="primary" onClick={onAccept}>
				<Text id="buttons.addCalendar" />
			</Button>

			<Button onClick={onDecline}>
				<Text id="buttons.decline" />
			</Button>
		</div>
	);
}
