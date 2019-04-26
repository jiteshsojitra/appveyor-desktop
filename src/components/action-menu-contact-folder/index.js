import { h, Component } from 'preact';
import { connect } from 'preact-redux';
import { Text } from 'preact-i18n';
import { callWith } from '../../lib/util';

import { toggle as toggleSettings } from '../../store/settings/actions';

import ActionMenu, { DropDownWrapper } from '../action-menu';
import ActionMenuGroup from '../action-menu-group';
import ActionMenuItem from '../action-menu-item';
import { CONTACT_GROUP_PREFIX } from '../../constants/contacts';
import style from './style.less';
@connect(
	null,
	{ toggleSettings }
)
export default class ActionMenuContactFolderList extends Component {
	renderFolder = ({ id, name }) => (
		<ActionMenuItem
			iconClass={style.listItemIcon}
			innerClass={style.listItemInner}
			onClick={callWith(this.props.onChange, id)}
			icon={id === this.props.selectedFolder ? 'check' : null}
		>
			<Text id={id}>{name}</Text>
		</ActionMenuItem>
	);

	renderContactGroups = ({ id, fileAsStr }) =>
		this.renderFolder({ id: `${CONTACT_GROUP_PREFIX}${id}`, name: fileAsStr });

	render({
		folders,
		contactGroups,
		selectedFolder,
		onChange,
		containerClass,
		actionButtonClass,
		actionTitleClass
	}) {
		const selectedFolderName = (selectedFolder &&
			(folders.find(f => f.id === selectedFolder) ||
				contactGroups.find(f => `${CONTACT_GROUP_PREFIX}${f.id}` === selectedFolder))) || (
			<Text id="contacts.picker.defaultContactChooserSource" iconPosition="right" />
		);

		return (
			<ActionMenu
				class={containerClass}
				toggleClass={actionButtonClass}
				titleClass={actionTitleClass}
				label={selectedFolderName.name || selectedFolderName.fileAsStr || selectedFolderName}
				anchor="end"
			>
				<DropDownWrapper>
					<ActionMenuGroup class={style.actionMenuContactFolderList}>
						<ActionMenuItem
							iconClass={style.listItemIcon}
							innerClass={style.listItemInner}
							onClick={callWith(onChange)}
							icon={(!selectedFolder && 'check') || null}
						>
							<Text id="contacts.picker.defaultContactChooserSource" />
						</ActionMenuItem>
						{folders.map(this.renderFolder)}
						{contactGroups && contactGroups.map(this.renderContactGroups)}
					</ActionMenuGroup>
				</DropDownWrapper>
			</ActionMenu>
		);
	}
}
