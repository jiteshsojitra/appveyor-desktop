import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import groupBy from 'lodash-es/groupBy';
import style from './style';
import OpenAddEditDelegatesButton from './open-add-edit-delegates-button';
import DelegatesListItem from './delegates-list-item';
import { withGetRights } from '../../../../graphql-decorators/rights';

@withGetRights()
export default class DelegatesList extends Component {
	render({ getRightsQuery }) {
		const { loading, error, getRights } = getRightsQuery;
		return (
			<div>
				{loading ? (
					'Loading...'
				) : error ? (
					`Error: ${error}`
				) : !getRights || !getRights.access || !getRights.access.length ? null : ( // Empty case, render nothing
					<ul>
						{Object.entries(groupBy(getRights.access, 'address')).map(([address, rights]) => (
							<DelegatesListItem address={address} rights={rights} />
						))}
					</ul>
				)}
				<OpenAddEditDelegatesButton class={style.addDelegates}>
					<Text id="settings.writingEmail.delegates.addDelegates" />
					...
				</OpenAddEditDelegatesButton>

				<Text id="settings.writingEmail.delegates.addDelegatesNotes" />
			</div>
		);
	}
}
