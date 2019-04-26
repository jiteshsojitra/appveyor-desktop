import { h } from 'preact';
import PureComponent from '../../lib/pure-component';
import FolderListItem from './item';
import get from 'lodash-es/get';
import withSearch from '../../graphql-decorators/search';
import cx from 'classnames';
import { CONTACTS } from '../../constants/folders';
import { CONTACT_GROUP_PREFIX } from '../../constants/contacts';
import style from './style';
import { addDropKey } from '../../utils/mail-list';

// ToDo: Same query is being fired from contacts/index.js with difference in params. Can we club it?
@withSearch({
	options: ({ lastUpdated }) => ({
		variables: {
			query: `in:"${CONTACTS}" #type:group`,
			types: 'contact',
			sortBy: 'nameAsc',
			limit: 1000,
			needExp: true,
			lastUpdated
		}
	}),
	props: ({ data: { search } }) => ({
		contactGroups: get(search, 'contacts')
	})
})
export default class ContactGroupsList extends PureComponent {
	contactGroupLink = contactGroup => {
		const { urlSlug, urlPrefix, onDrop, handleAfterAction } = this.props;
		return (
			<FolderListItem
				folder={{ ...contactGroup }}
				view="contactGroup"
				depth={1}
				onDrop={onDrop}
				dropTargetType="contactGroup"
				urlPrefix={urlPrefix == null ? CONTACT_GROUP_PREFIX : urlPrefix}
				urlSlug={urlSlug}
				urlSuffixProp="id"
				nameProp="fileAsStr"
				afterAction={handleAfterAction}
			/>
		);
	};

	render({ account, contactGroups, label, urlSlug, urlPrefix, onDrop, lastUpdated, ...props }) {
		contactGroups = contactGroups && contactGroups.length > 0 && addDropKey(contactGroups, true);
		return (
			<div {...props} class={cx(style.folderList, style.contactGroupsList, props.class)}>
				{label && contactGroups && contactGroups.length > 0 && (
					<div class={style.divider}>{label}</div>
				)}

				{contactGroups && contactGroups.map(this.contactGroupLink)}
			</div>
		);
	}
}
