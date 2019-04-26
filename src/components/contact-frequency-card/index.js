import { h } from 'preact';
import { Text, withText } from 'preact-i18n';
import { graphql } from 'react-apollo';
import { compose, branch, renderNothing, withStateHandlers, withProps } from 'recompose';
import get from 'lodash/get';
import find from 'lodash/find';
import map from 'lodash/map';
import sumBy from 'lodash/sumBy';
import cx from 'classnames';
import moment from 'moment';

import { callWith } from '../../lib/util';
import { getJobDescription, getName, getAttachedImageUrl } from '../../utils/contacts';
import { configure } from '../../config';

import SearchQuery from '../../graphql/queries/search/search.graphql';
import GetContactFrequencyQuery from '../../graphql/queries/contacts/get-contact-frequency.graphql';

import { BarChart, Bar, XAxis } from 'recharts';
import { Icon } from '@zimbra/blocks';
import NakedButton from '../naked-button';
import Avatar from '../avatar';
import ContactCardMenu from '../contact-card-menu';
import getContext from '../../lib/get-context';

import s from './style.less';

const RANGES = {
	'1m': 'd',
	'6m': 'w',
	'1y': 'm'
};

const LABEL_FORMAT = "MMM D [']YY";

function getDataPointsForRange(frequencyData, selectedRange) {
	return get(find(frequencyData, ['by', RANGES[selectedRange]]), 'dataPoint', []);
}

const FrequencyGraph = ({ data, onChangeRange, selectedRange = '6m' }) => (
	<div>
		<div class={s.rangeControls}>
			{map(RANGES, (v, k) => (
				<NakedButton
					class={cx(s.rangeButton, k === selectedRange && s.active)}
					onClick={callWith(onChangeRange, k)}
					linkColor
				>
					{k}
				</NakedButton>
			))}
		</div>
		<BarChart width={328} height={92} maxBarSize={10} data={data}>
			<XAxis
				dataKey="readableLabel"
				interval="preserveStartEnd"
				minTickGap={50}
				axisLine={false}
				tickLine={false}
			/>
			<Bar dataKey="value" fill="#B4D9F8" />
		</BarChart>
	</div>
);

const FrequencyDescription = withText(({ selectedRange }) => ({
	dateRangeText: `search.cards.contactFrequency.dateRangeLabel.${selectedRange}`
}))(({ name, firstMessageSubject, numMessages, dateRangeText, class: cls }) => (
	<div class={cls}>
		<Text
			id="search.cards.contactFrequency.frequencyDescription"
			fields={{
				name,
				firstMessageSubject,
				numMessages,
				dateRangeText
			}}
		/>
	</div>
));

const ContactFrequencyCard = ({
	contact,
	contact: {
		attributes,
		attributes: { jobTitle, email, phone }
	},
	contactFrequencyData,
	firstMessageFromContact,
	onChangeRange,
	refetchContact,
	selectedRange,
	imageURL
}) => {
	const name = getName(attributes);
	const jobDescription = getJobDescription(attributes);
	const dataPoints = getDataPointsForRange(contactFrequencyData, selectedRange).map(point => ({
		...point,
		readableLabel: moment(point.label).format(LABEL_FORMAT)
	}));
	const numMessages = sumBy(dataPoints, 'value');

	return (
		<div class={s.card}>
			<div class={cx(s.section, s.pb0)}>
				<div class={s.topSection}>
					<div class={s.topSectionInfo}>
						<div class={s.title}>
							{name && <div class={s.name}>{name}</div>}
							{jobTitle && <div class={s.jobTitle}>{jobDescription}</div>}
						</div>
						{email && (
							<div class={s.attribute}>
								<div class={s.inlineIconContainer}>
									<Icon class={s.inlineIcon} name="envelope" />
								</div>{' '}
								{email}
							</div>
						)}
						{phone && (
							<div class={s.attribute}>
								<div class={s.inlineIconContainer}>
									<Icon class={s.inlineIcon} name="mobile-phone" />
								</div>{' '}
								{phone}
							</div>
						)}
					</div>
					<div class={s.topSectionAvatar}>
						<Avatar class={s.avatar} email={email} profileImageURL={imageURL} />
					</div>
				</div>
				<ContactCardMenu
					afterEdit={refetchContact}
					contact={contact}
					email={email}
					jobDescription={jobDescription}
					name={name}
					phone={phone}
					enableEdit
				/>
			</div>
			{contactFrequencyData && (
				<FrequencyGraph
					class={cx(s.section, s.frequencyDescription)}
					data={dataPoints}
					onChangeRange={onChangeRange}
					selectedRange={selectedRange}
				/>
			)}
			{contactFrequencyData && firstMessageFromContact && (
				<FrequencyDescription
					class={cx(s.section, s.frequencyDescription)}
					firstMessageSubject={firstMessageFromContact.subject}
					name={name}
					numMessages={numMessages}
					selectedRange={selectedRange}
				/>
			)}
		</div>
	);
};

export default compose(
	graphql(SearchQuery, {
		skip: props => !props.email,
		options: ({ email }) => ({
			variables: {
				types: 'contact',
				query: `contact:${email}`
			}
		}),
		props: ({ data: { loading, search, refetch } }) => ({
			loading,
			refetchContact: refetch,
			contact: get(search, 'contacts.0')
		})
	}),
	graphql(SearchQuery, {
		skip: props => !props.email,
		options: ({ email }) => ({
			variables: {
				types: 'message',
				query: `tofrom:${email}`,
				limit: 1,
				sortBy: 'dateAsc'
			}
		}),
		props: ({ data: { search } }) => ({
			firstMessageFromContact: get(search, 'messages.0')
		})
	}),
	graphql(GetContactFrequencyQuery, {
		skip: props => !props.email || GetContactFrequencyQuery.isUnsupported,
		options: ({ email }) => ({
			variables: {
				email,
				by: 'dwm'
			}
		}),
		props: ({ data: { getContactFrequency, error } }) => {
			if (error) {
				GetContactFrequencyQuery.isUnsupported = true;
			}
			return {
				contactFrequencyData: get(getContactFrequency, 'data')
			};
		}
	}),
	branch(({ contact }) => !contact, renderNothing),
	withStateHandlers(
		{ selectedRange: '6m' },
		{ onChangeRange: () => selectedRange => ({ selectedRange }) }
	),
	configure('zimbraOrigin'),
	getContext(({ zimbraBatchClient }) => ({ zimbraBatchClient })),
	withProps(({ contact, zimbraOrigin, zimbraBatchClient }) => ({
		imageURL: get(contact, 'attributes')
			? getAttachedImageUrl(contact, zimbraOrigin, zimbraBatchClient)
			: ''
	}))
)(ContactFrequencyCard);
