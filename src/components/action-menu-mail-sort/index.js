import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { Text, withText } from 'preact-i18n';
import { callWith } from '../../lib/util';

import { SORT_BY } from '../../constants/search';
import { groupMailBy } from '../../constants/user-prefs';
import { toggle as toggleSettings } from '../../store/settings/actions';

import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import { withModifyPrefs } from '../../graphql-decorators/preferences';
import withAccountInfo from '../../graphql-decorators/account-info';

const SortActionMenuItem = ({ sort, sortBy, onSort, children }) => (
	<ActionMenuItem icon={sort === sortBy ? 'check' : null} onClick={callWith(onSort, sort)}>
		{children}
	</ActionMenuItem>
);

@withAccountInfo(({ data: { accountInfo: account } }) => ({
	groupBy: account.prefs[groupMailBy.name]
}))
@withModifyPrefs()
@withText({
	dateDescLabel: 'mail.sortLabels.dateDesc',
	dateAscLabel: 'mail.sortLabels.dateAsc',
	attachDescLabel: 'mail.sortLabels.attachDesc',
	flagDescLabel: 'mail.sortLabels.flagDesc',
	nameAscLabel: 'mail.sortLabels.nameAsc',
	rcptAscLabel: 'mail.sortLabels.rcptAsc',
	subjAscLabel: 'mail.sortLabels.subjAsc',
	readDescLabel: 'mail.sortLabels.readDesc',
	sizeAscLabel: 'mail.sortLabels.sizeAsc',
	sizeDescLabel: 'mail.sortLabels.sizeDesc'
})
@connect(
	null,
	{ toggleSettings }
)
export default class ActionMenuMailSort extends Component {
	handleGroupMailByClick = () => {
		const { conversation, message } = groupMailBy.values;
		const val = this.props.groupBy === conversation ? message : conversation;
		this.props.modifyPrefs({
			[groupMailBy.name]: val
		});
	};

	render({ groupBy, localFolder, ...props }) {
		return (
			<ActionMenu label={props[`${props.sortBy}Label`]} anchor="end">
				<DropDownWrapper>
					<ActionMenuGroup>
						<SortActionMenuItem {...props} sort={SORT_BY.dateDesc}>
							<Text id="mail.sortMenu.dateDesc" />
						</SortActionMenuItem>
						<SortActionMenuItem {...props} sort={SORT_BY.dateAsc}>
							<Text id="mail.sortMenu.dateAsc" />
						</SortActionMenuItem>
						<SortActionMenuItem {...props} sort={SORT_BY.readDesc}>
							<Text id="mail.sortMenu.readDesc" />
						</SortActionMenuItem>
						<SortActionMenuItem {...props} sort={SORT_BY.sizeDesc}>
							<Text id="mail.sortMenu.sizeDesc" />
						</SortActionMenuItem>
						<SortActionMenuItem {...props} sort={SORT_BY.sizeAsc}>
							<Text id="mail.sortMenu.sizeAsc" />
						</SortActionMenuItem>
						<SortActionMenuItem {...props} sort={SORT_BY.attachDesc}>
							<Text id="mail.sortMenu.attachDesc" />
						</SortActionMenuItem>
						<SortActionMenuItem {...props} sort={SORT_BY.flagDesc}>
							<Text id="mail.sortMenu.flagDesc" />
						</SortActionMenuItem>
						<SortActionMenuItem {...props} sort={SORT_BY.nameAsc}>
							<Text id="mail.sortMenu.nameAsc" />
						</SortActionMenuItem>
						<SortActionMenuItem {...props} sort={SORT_BY.rcptAsc}>
							<Text id="mail.sortMenu.rcptAsc" />
						</SortActionMenuItem>
						<SortActionMenuItem {...props} sort={SORT_BY.subjAsc}>
							<Text id="mail.sortMenu.subjAsc" />
						</SortActionMenuItem>
					</ActionMenuGroup>
					<ActionMenuGroup>
						<ActionMenuItem
							onClick={this.handleGroupMailByClick}
							disabled={localFolder}
							icon={groupBy === groupMailBy.values.conversation ? 'check' : null}
						>
							<Text id="mail.sortMenu.groupByConversations" />
						</ActionMenuItem>
					</ActionMenuGroup>
					<ActionMenuGroup>
						<ActionMenuItem onClick={props.toggleSettings}>
							<Text id="mail.sortMenu.settings" />
						</ActionMenuItem>
					</ActionMenuGroup>
				</DropDownWrapper>
			</ActionMenu>
		);
	}
}
