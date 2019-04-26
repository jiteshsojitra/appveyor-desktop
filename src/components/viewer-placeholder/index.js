import { h } from 'preact';
import { Icon } from '@zimbra/blocks';
import { connect } from 'preact-redux';
import { Text } from 'preact-i18n';
import PropTypes from 'prop-types';

import s from './style.less';

const ViewerPlaceholder = ({ numSelected, mailItemId, mailItem, isOffline }) => (
	<div class={s.placeholder}>
		<Icon name="client:email-placeholder" />
		{isOffline && mailItemId && !mailItem && (
			<p class={s.unavailable}>
				<Text id="mail.viewer.unavailableOffline" />
			</p>
		)}
		{numSelected > 0 && <div class={s.numOverlay}>{numSelected}</div>}
	</div>
);

ViewerPlaceholder.defaultProps = {
	numSelected: 0
};

ViewerPlaceholder.propTypes = {
	numSelected: PropTypes.number
};

export default connect(state => ({ isOffline: state.network.isOffline }))(ViewerPlaceholder);
