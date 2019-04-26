import { h, Component } from 'preact';
import wire from 'wiretie';
import linkState from 'linkstate';
import { Text } from 'preact-i18n';
import { graphql } from 'react-apollo';
import { connect } from 'preact-redux';

import CalendarCreateSharedMutation from '../../../graphql/queries/calendar/calendar-create-shared.graphql';

import ModalDrawerToolbar from '../../modal-drawer-toolbar';
import ModalDrawer from '../../modal-drawer';
import ModalDialog from '../../modal-dialog';
import OwnerEmailInput from './owner-email-input';
import SharedCalendarInput from './shared-calendar-input';

import { notify } from '../../../store/notifications/actions';
import { isValidEmail } from '../../../lib/util';
import withMediaQuery from '../../../enhancers/with-media-query/index';
import { minWidth, screenMd } from '../../../constants/breakpoints';

import style from './style.less';

const activePanelType = {
	EMAIL: 'email',
	CALENDAR_DETAILS: 'calendar-details'
};

@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
@wire('zimbra', null, zimbra => ({
	getShareInfo: zimbra.share.getInfo
}))
@connect(
	null,
	{ notify }
)
@graphql(CalendarCreateSharedMutation, {
	props: ({ ownProps: { onRefetchCalendars, notify: displayNotification }, mutate }) => ({
		createSharedCalendar: variables =>
			mutate({
				variables: {
					link: variables
				}
			})
				.then(() => onRefetchCalendars())
				.then(() => {
					displayNotification({
						message: (
							<Text
								id="calendar.dialogs.newSharedCalendar.CALENDAR_LINKED_TOAST"
								fields={{ calendarName: variables.name }}
							/>
						)
					});
				})
	})
})
export default class CreateSharedCalendarModal extends Component {
	state = {
		calendar: {
			ownerZimbraId: '',
			sharedItemId: '',
			name: '',
			color: 1,
			reminder: false
		},
		ownerCalendarTitleOptions: [],
		ownerEmailAddress: '',
		error: '',
		activePanel: activePanelType.EMAIL,
		activePanelPending: false
	};

	handleAction = () => {
		if (this.state.activePanel === activePanelType.EMAIL) {
			const [name] = this.state.ownerEmailAddress.split('@');
			this.setState({ activePanelPending: true }, () => {
				this.props.getShareInfo(name).then(shares => {
					if (shares.length) {
						const ownerCalendarOptions = shares.map(({ folderPath, folderId }) => ({
							// truncate leading "/" of abs path
							label: folderPath.slice(1),
							value: folderId
						}));
						this.setState({
							error: null,
							activePanelPending: false,
							activePanel: activePanelType.CALENDAR_DETAILS,
							calendar: {
								...this.state.calendar,
								sharedItemId: ownerCalendarOptions[0].value,
								// ownerId is constant across share options
								ownerZimbraId: shares[0].ownerId
							},
							ownerCalendarOptions
						});
					} else {
						this.setState({
							activePanelPending: false,
							error: (
								<Text
									id="calendar.dialogs.newSharedCalendar.NO_SHARES_FOR_EMAIL_ERROR"
									fields={{
										providerName: this.props.providerName,
										email: this.state.ownerEmailAddress
									}}
								/>
							)
						});
					}
				});
			});
		} else {
			const isValid = this.props.validateNewSharedCalendar(this.state.calendar);
			if (isValid) {
				this.setState(
					{
						error: null,
						activePanelPending: true
					},
					() => {
						this.props
							.createSharedCalendar({
								...this.state.calendar,
								owner: this.state.ownerEmailAddress
							})
							.then(() => {
								this.setState({ activePanelPending: false });
								this.props.onClose();
							});
					}
				);
			} else {
				this.setState({
					error: <Text id="calendar.dialogs.newSharedCalendar.ERROR_DUPLICATE_CALENDAR" />
				});
			}
		}
	};

	onOwnerEmailFormSubmit = event => {
		event.preventDefault();
		if (!this.disableActionForPanel(this.state.activePanel)) {
			this.handleAction();
		}
	};

	handleCalendarDetailsChange = calendarDetails => {
		this.setState({
			calendar: {
				...this.state.calendar,
				...calendarDetails
			}
		});
	};

	disableActionForPanel = activePanel =>
		activePanel === activePanelType.EMAIL
			? !isValidEmail(this.state.ownerEmailAddress)
			: this.state.calendar.name.length === 0;

	handleCloseDrawer = () => {
		this.setState({ isDrawerMounted: false });
		this.props.onClose();
	};

	render(
		{ onClose, providerName, matchesScreenMd },
		{
			activePanel,
			activePanelPending,
			calendar,
			error,
			ownerCalendarOptions,
			ownerEmailAddress,
			isDrawerMounted
		}
	) {
		const [ModalDialogOrDrawer, componentClassProps] = matchesScreenMd
			? [
					ModalDialog,
					{
						autofocusChildIndex: 1,
						actionLabel: 'buttons.save',
						contentClass: style.createSharedCalendarModalContent,
						disablePrimary: this.disableActionForPanel(activePanel),
						onClose,
						onAction: this.handleAction,
						error
					}
			  ]
			: [
					ModalDrawer,
					{
						mounted: isDrawerMounted,
						onClickOutside: this.handleCloseDrawer,
						toolbar: (
							<ModalDrawerToolbar
								actionLabel="buttons.save"
								onAction={this.handleAction}
								onClose={this.handleCloseDrawer}
								disablePrimary={this.disableActionForPanel(activePanel)}
								pending={activePanelPending}
							/>
						)
					}
			  ];

		return (
			<ModalDialogOrDrawer
				{...componentClassProps}
				title="calendar.dialogs.newSharedCalendar.DIALOG_TITLE"
				pending={activePanelPending}
			>
				<div class={style.contentWrapper}>
					{activePanel === activePanelType.EMAIL ? (
						<OwnerEmailInput
							value={ownerEmailAddress}
							onChange={linkState(this, 'ownerEmailAddress')}
							providerName={providerName}
							onSubmit={this.onOwnerEmailFormSubmit}
						/>
					) : (
						<SharedCalendarInput
							value={calendar}
							onChange={this.handleCalendarDetailsChange}
							ownerCalendarOptions={ownerCalendarOptions}
							ownerEmailAddress={ownerEmailAddress}
						/>
					)}
				</div>
			</ModalDialogOrDrawer>
		);
	}
}
