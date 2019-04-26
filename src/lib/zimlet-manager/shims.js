import * as preact from 'preact';
import * as preactCompat from 'preact-compat';
import * as allBlocks from '@zimbra/blocks';

/* @zimbra/util */
import array from '@zimbra/util/src/array';
import { getDataTransferJSON, setDataTransferJSON } from '@zimbra/util/src/data-transfer-manager';
import { callWith } from '@zimbra/util/src/call-with';

import { getName } from '../../utils/contacts';
import { route, Link } from 'preact-router';
import { Provider, connect, connectAdvanced } from 'preact-redux';
import Match from 'preact-router/match';
import {
	ApolloConsumer,
	ApolloProvider,
	Query,
	Mutation,
	Subscription,
	graphql,
	withApollo,
	compose
} from 'react-apollo';
import CalendarsAndAppointmentsQuery from '../../graphql/queries/calendar/calendars-and-appointments.graphql';
import CalendarCreateMutation from '../../graphql/queries/calendar/calendar-create.graphql';
import { withCalendars, withCreateAppointment } from '../../graphql-decorators/calendar';
import withMediaQuery from '../../enhancers/with-media-query/index';
import registerTab from '../../enhancers/register-tab';
import * as breakpoints from '../../constants/breakpoints';
import { ATTENDEE_ROLE, PARTICIPATION_STATUS } from '../../constants/calendars';
import withSearch from '../../graphql-decorators/search';
import { pruneEmpty } from '../../utils/filter';
import { withCreateContact } from '../../graphql-decorators/contact';
import withContactAction from '../../graphql-decorators/contact/contact-action';
import ModalDrawer from '../../components/modal-drawer';
import ModalDrawerToolbar from '../../components/modal-drawer-toolbar';
import BackArrow from '../../components/back-arrow';
import Select from '../../components/select';
import NakedButton from '../../components/naked-button/index';

export default {
	preact,
	'preact-compat': preactCompat,
	'preact-redux': { Provider, connect, connectAdvanced },
	'preact-router': {
		// Zimlets must share same router instance to route within the app
		route,
		Link
	},
	'preact-router/match': {
		Match
	},
	'react-apollo': {
		ApolloConsumer,
		ApolloProvider,
		Query,
		Mutation,
		Subscription,
		graphql,
		withApollo,
		compose
	},
	'@zimbra-client/blocks': allBlocks,
	'@zimbra-client/components': {
		ModalDrawer,
		ModalDrawerToolbar,
		BackArrow,
		Select,
		NakedButton
	},
	'@zimbra-client/util': {
		array,
		getDataTransferJSON,
		setDataTransferJSON,
		breakpoints,
		callWith,
		pruneEmpty
	},
	'@zimbra-client/util/contacts': {
		getName
	},
	'@zimbra-client/graphql': {
		CalendarsAndAppointmentsQuery,
		withCreateAppointment,
		withCalendars,
		withSearch,
		withCreateContact,
		withContactAction,
		CalendarCreateMutation
	},
	'@zimbra-client/enhancers': {
		withMediaQuery,
		registerTab
	},
	'@zimbra-client/constants': {
		ATTENDEE_ROLE,
		PARTICIPATION_STATUS
	}
};
