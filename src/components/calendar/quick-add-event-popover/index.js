import moment from 'moment';
import { h, Component } from 'preact';
import Portal from 'preact-portal';
import linkstate from 'linkstate';
import { Text } from 'preact-i18n';
import { Button, ClickOutsideDetector } from '@zimbra/blocks';
import FormGroup from '../../form-group';
import TextInput from '../../text-input';
import AlignedForm from '../../aligned-form';
import AlignedLabel from '../../aligned-form/label';
import AddressField from '../../address-field';
import isString from 'lodash/isString';
import CloseButton from '../../close-button';
import { deepClone } from '../../../lib/util';
import {
	ATTENDEE_ROLE,
	PARTICIPATION_STATUS,
	CALENDAR_USER_TYPE
} from '../../../constants/calendars';

import s from './style.less';

export default class QuickAddEventPopover extends Component {
	state = {
		event: null,
		locations: []
	};

	setEvent = props => {
		this.setState({
			event: props.event
		});
	};

	handleSubmit = e => {
		e.preventDefault();
		const { event, locations } = this.state;

		this.props.onSubmit({
			...event,
			locations,
			isDraft: !locations.find(
				location => location.calendarUserType === CALENDAR_USER_TYPE.resource
			),
			isQuickAddEvent: true
		});
	};

	handleAddMoreDetails = () => {
		this.props.onAddMoreDetails({
			...this.state.event,
			locations: this.state.locations
		});
	};

	handleClose = () => {
		this.props.onClose();
	};

	handleClickOutside = () => {
		if (this.mounted) {
			this.handleClose();
		}
	};

	handleLocationChange = ({ value }) => {
		const locations = value.map(locationResource => {
			if (isString(locationResource)) {
				return locationResource;
			}

			const location = this.state.locations.find(
				({ address }) => locationResource.address === address
			);

			if (locationResource.zimbraCalResType || locationResource.originalEmail) {
				const { shortName, originalEmail, ...restLocation } = locationResource;

				return {
					// Default values
					role: ATTENDEE_ROLE.required,
					participationStatus: PARTICIPATION_STATUS.needsAction,
					rsvp: true,
					calendarUserType: CALENDAR_USER_TYPE.resource,

					// Values stored in state
					...(location && {
						role: location.role,
						participationStatus: location.participationStatus,
						rsvp: location.rsvp
					}),

					// Values from address field
					...restLocation
				};
			}

			return location || locationResource;
		});

		// Separate location resources and user text input and order them such that all user text inputs come at the end.
		const resources = [],
			userInputs = [];
		locations.forEach(loc => {
			if (!isString(loc) && (loc.zimbraCalResType || loc.calendarUserType)) {
				resources.push(deepClone(loc));
			} else {
				userInputs.push(deepClone(loc));
			}
		});
		this.setState({ locations: resources.concat(userInputs) });
	};

	validateLocationToken = (address, token) => address || token;

	componentWillMount() {
		this.setEvent(this.props);
	}

	componentWillReceiveProps(nextProps) {
		this.setEvent(nextProps);
	}

	componentDidUpdate() {
		// Ignore any click-outside-events until after the first call to componentDidUpdate
		// Solves a problem when this component is mounted in the middle of an ongoing click event
		this.mounted = true;
	}

	render({ style }, { event, locations }) {
		return (
			<Portal into="body">
				<ClickOutsideDetector onClickOutside={this.handleClickOutside}>
					<div class={s.container} style={style}>
						<CloseButton class={s.closeButton} onClick={this.handleClose} />

						<form onSubmit={this.handleSubmit}>
							<AlignedForm>
								<FormGroup compact>
									<AlignedLabel width="60px">Title</AlignedLabel>
									<TextInput
										value={event.name}
										onInput={linkstate(this, 'event.name')}
										wide
										autofocus
									/>
								</FormGroup>
								<FormGroup compact>
									<AlignedLabel width="60px">Location</AlignedLabel>
									<AddressField
										class={s.addressField}
										value={locations}
										onChange={this.handleLocationChange}
										validateToken={this.validateLocationToken}
										type="resource"
										isLocation
										formSize
									/>
								</FormGroup>
								<FormGroup>
									<AlignedLabel width="60px">Date</AlignedLabel>
									<div class={s.dateField}>
										{moment(event.start).format('llll')} - {moment(event.end).format('LT')}
									</div>
								</FormGroup>

								<div>
									<Button type="submit" class={s.button} styleType="primary" brand="primary">
										<Text id="buttons.save" />
									</Button>
									<Button type="button" class={s.button} onClick={this.handleAddMoreDetails}>
										<Text id="buttons.addMoreDetails" />
									</Button>
								</div>
							</AlignedForm>
						</form>
					</div>
				</ClickOutsideDetector>
			</Portal>
		);
	}
}
