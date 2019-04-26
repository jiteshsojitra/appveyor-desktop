import { h, Component } from 'preact';
import { withText, Text } from 'preact-i18n';
import { Button } from '@zimbra/blocks';
import ModalDrawerToolbar from '../../modal-drawer-toolbar';
import ModalDrawer from '../../modal-drawer';
import linkstate from 'linkstate';
import { graphql } from 'react-apollo';
import isNil from 'lodash-es/isNil';
import some from 'lodash-es/some';
import { errorMessage } from '../../../utils/errors';
import ModalDialog from '../../modal-dialog';
import CalendarCreateMutation from '../../../graphql/queries/calendar/calendar-create.graphql';
import ColorPicker from '../../color-picker';
import TextInput from '../../text-input';
import withMediaQuery from '../../../enhancers/with-media-query/index';
import { minWidth, screenMd } from '../../../constants/breakpoints';

import { CALENDAR_TYPE, CALENDAR_IDS } from '../../../constants/calendars';
import { calendarType as getCalendarType } from '../../../utils/calendar';
import style from './style';

@withText({
	duplicateCalendarError: 'calendar.dialogs.newCalendar.ERROR_DUPLICATE_CALENDAR',
	inputPlaceholder: 'calendar.dialogs.newCalendar.INPUT_PLACEHOLDER'
})
@graphql(CalendarCreateMutation, {
	props: ({ ownProps: { refetchCalendars, calendarType, onClose }, mutate }) => ({
		createCalendar: (name, color, url) =>
			mutate({
				variables: {
					name,
					color: Number(color),
					url
				}
			}).then(() => {
				switch (calendarType) {
					case 'Holidays': {
						onClose('Holidays');
						break;
					}
					default: {
						onClose();
						break;
					}
				}
				refetchCalendars();
			})
	})
})
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
export default class CreateCalendarModal extends Component {
	state = {
		calendarName: '',
		calendarColor: 1,
		loading: false,
		error: null
	};

	validate = (calendarName, calendars) => {
		const nameExists = some(calendars, ({ name }) => name === calendarName);
		if (nameExists) {
			return this.props.duplicateCalendarError;
		}
	};

	getAction = ({ calendarName, calendarColor }, { id, name }) => {
		const actionArray = [];
		if (calendarName !== name) {
			actionArray.push(
				this.props.folderAction({
					op: 'rename',
					id,
					name: calendarName
				})
			);
		}
		if (calendarColor !== this.props.calendar.color) {
			actionArray.push(this.props.changeFolderColor(id, calendarColor));
		}
		return actionArray;
	};

	onChangeColor = value => {
		this.setState({ calendarColor: value });
	};

	onAction = () => {
		const error = this.validate(this.state.calendarName, this.props.calendarsData.calendars);
		if (!error) {
			this.setState(
				{ loading: true },
				() =>
					this.props.createCalendar !== undefined &&
					this.props
						.createCalendar(
							this.state.calendarName,
							this.state.calendarColor,
							this.props.predefinedUrl || undefined
						)
						.catch(e => {
							this.setState({ loading: false, error: errorMessage(e) });
							console.error(e);
						})
			);
		} else {
			this.setState({ error });
		}
	};

	onUpdate = () => {
		let error;
		if (this.state.calendarName !== this.props.calendar.name) {
			error = this.validate(this.state.calendarName, this.props.calendarsData.calendars);
		}

		if (!error) {
			this.props.onClose();
			Promise.all(this.getAction(this.state, this.props.calendar))
				.then(() => {
					this.props.notify({
						message: <Text id="calendar.notifications.calendarUpdated" />
					});
				})
				.catch(err => {
					this.props.notify({
						message: <Text id="error.genericInvalidRequest" />
					});
					console.error(err);
				});
		} else {
			this.setState({ error });
		}
	};

	onDeleteCalendar = () => {
		this.props.onClose();
		this.props.trashCalendar(this.props.calendar);
	};

	onDeleteLinkedCalendar = () => {
		this.props.onClose();
		this.props.trashCalendar(this.props.calendar, true);
	};

	handleCloseDrawer = () => {
		this.setState({ isDrawerMounted: false });
		this.props.onClose();
	};

	componentWillMount = () => {
		if (!isNil(this.props.predefinedName)) {
			this.setState({
				calendarName: this.props.predefinedName
			});
		}

		if (this.props.calendar) {
			const { name, color } = this.props.calendar;
			this.setState({
				calendarName: name,
				calendarColor: color
			});
		}
	};

	render(
		{ matchesScreenMd, onClose, inputPlaceholder },
		{ calendarName, calendarColor, error, loading, isDrawerMounted }
	) {
		const isNew = !this.props.calendar;
		const calType = this.props.calendar && getCalendarType(this.props.calendar);
		const isOwn = calType === CALENDAR_TYPE.own;
		const isPrimary =
			this.props.calendar && this.props.calendar.id === CALENDAR_IDS[CALENDAR_TYPE.own].DEFAULT;
		const disablePrimary = calendarName.length === 0 || isNil(calendarColor);

		const [ComponentClass, componentClassProps] = matchesScreenMd
			? [ModalDialog, { autofocusChildIndex: 1 }]
			: [
					ModalDrawer,
					{
						mounted: isDrawerMounted,
						toolbar: (
							<ModalDrawerToolbar
								buttons={[
									<Button
										styleType="primary"
										brand="primary"
										onClick={isNew ? this.onAction : this.onUpdate}
										disabled={loading || disablePrimary}
									>
										<Text id="buttons.save" />
									</Button>,
									!isNew && (
										<Button
											onClick={isOwn ? this.onDeleteCalendar : this.onDeleteLinkedCalendar}
											disabled={isPrimary}
										>
											<Text id={isOwn ? 'buttons.delete' : 'buttons.unfollow'} />
										</Button>
									)
								]}
								onClose={this.handleCloseDrawer}
							/>
						)
					}
			  ];

		return (
			<ComponentClass
				{...componentClassProps}
				title={`calendar.dialogs.newCalendar.${isNew ? 'DIALOG_TITLE' : 'EDIT_DIALOG_TITLE'}`}
				onClose={onClose}
				disablePrimary={disablePrimary}
				pending={loading}
				matchesScreenMd={matchesScreenMd}
				buttons={[
					<Button
						styleType="primary"
						brand="primary"
						onClick={isNew ? this.onAction : this.onUpdate}
						disabled={loading || disablePrimary}
					>
						<Text id="buttons.save" />
					</Button>,
					!isNew && (
						<Button
							onClick={isOwn ? this.onDeleteCalendar : this.onDeleteLinkedCalendar}
							disabled={isPrimary}
						>
							<Text id={isOwn ? 'buttons.delete' : 'buttons.unfollow'} />
						</Button>
					)
				]}
				class={style.createCalendarModal}
				contentClass={style.createCalendarModalContent}
				error={error}
			>
				<div class={style.contentWrapper}>
					<TextInput
						value={calendarName}
						onInput={linkstate(this, 'calendarName')}
						placeholder={inputPlaceholder}
						disabled={isPrimary}
						wide
					/>
					<div class={style.colorPickerContainer}>
						<div class={style.colorLabel}>
							<Text id="calendar.dialogs.newCalendar.COLOR_LABEL">Color</Text>
						</div>
						<div class={style.colorPicker}>
							<ColorPicker onChange={this.onChangeColor} value={calendarColor} />
						</div>
					</div>
				</div>
			</ComponentClass>
		);
	}
}
