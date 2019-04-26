import { h, Component } from 'preact';
import ModalDialog from './modal-dialog';
import ModalDrawer from './modal-drawer';
import withMediaQuery from '../enhancers/with-media-query';
import { minWidth, screenMd } from '../constants/breakpoints';

@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
export default class ResponsiveModal extends Component {
	render({ matchesScreenMd, drawerProps, dialogProps, ...props }) {
		return h(
			...(matchesScreenMd
				? [ModalDialog, { ...props, ...dialogProps }]
				: [ModalDrawer, { ...props, ...drawerProps }])
		);
	}
}
