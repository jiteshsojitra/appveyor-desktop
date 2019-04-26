import { h, Component } from 'preact';
import CalendarEventDetails from './event-details';
import ModalDrawer from '../../modal-drawer';
import get from 'lodash/get';
import style from './style';
import { deletePermissionCheck } from '../../../utils/event';

export default class CalendarEventDetailsModal extends Component {
	onEdit = () => {
		const { onEdit, event, onClose } = this.props;

		onClose();
		onEdit(event);
	};

	onDelete = () => {
		const { onDelete, event, onClose } = this.props;

		onClose();
		onDelete(event);
	};

	render({ onClose, event, ...props }) {
		const eventPermissions = get(event, 'permissions', '');
		const writePermission = eventPermissions.includes('w');
		const hasWritePermission =
			!eventPermissions ||
			((event.class === 'PRI' && eventPermissions.includes('p') && writePermission) ||
				(event.class === 'PUB' && writePermission));
		const hasDeletePermission =
			!eventPermissions || deletePermissionCheck(eventPermissions, event.class);

		return (
			<ModalDrawer onClickOutside={onClose}>
				<div class={style.eventDrawer}>
					<CalendarEventDetails
						{...props}
						event={event}
						onEdit={hasWritePermission && this.onEdit}
						onDelete={hasDeletePermission && this.onDelete}
					/>
				</div>
			</ModalDrawer>
		);
	}
}
