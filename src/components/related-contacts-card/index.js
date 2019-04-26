import { h } from 'preact';
import { Link } from 'preact-router';
import { Text } from 'preact-i18n';
import { compose, branch, renderNothing, withStateHandlers } from 'recompose';
import { graphql } from 'react-apollo';
import get from 'lodash/get';
import { updateQuery } from '../../utils/query-params';

import RelatedContactsQuery from '../../graphql/queries/contacts/related-contacts.graphql';

import Avatar from '../avatar';
import CardSectionTitle from '../card-section-title';

import s from './style.less';

const RelatedContact = ({ contact }) => (
	<Link class={s.relatedContact} href={updateQuery({ e: contact.email })}>
		<div>
			<Avatar class={s.avatar} email={contact.email} />
		</div>
		<div class={s.info}>
			<div class={s.name}>{contact.p}</div>
			<div class={s.email}>{contact.email}</div>
		</div>
	</Link>
);

const RelatedContactsCard = ({ contacts, showAll, toggleShowAll }) => (
	<div class={s.card}>
		<CardSectionTitle>
			<Text id="search.cards.relatedContacts.title" />
		</CardSectionTitle>
		{(showAll ? contacts : contacts.slice(0, 3)).map(contact => (
			<RelatedContact contact={contact} />
		))}
		{contacts.length > 3 && (
			<div class={s.showAll} onClick={toggleShowAll}>
				<Text id={`search.cards.relatedContacts.${showAll ? 'hideAll' : 'showAll'}`} />
			</div>
		)}
	</div>
);

export default compose(
	graphql(RelatedContactsQuery, {
		skip: props => !props.email || RelatedContactsQuery.isUnsupported,
		options: ({ email }) => ({
			variables: { email }
		}),
		props: ({ data: { error, relatedContacts } }) => {
			if (error) {
				RelatedContactsQuery.isUnsupported = true;
			}
			return {
				contacts: get(relatedContacts, 'relatedContacts')
			};
		}
	}),
	branch(({ contacts }) => !contacts, renderNothing),
	withStateHandlers(
		{ showAll: false },
		{ toggleShowAll: ({ showAll }) => () => ({ showAll: !showAll }) }
	)
)(RelatedContactsCard);
