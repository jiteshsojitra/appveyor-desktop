import { h } from 'preact';
import { Icon, Button } from '@zimbra/blocks';
import style from '../style';
import { Text } from 'preact-i18n';
import cx from 'classnames';

export default function SelectedContactsActions({
	selectedCount,
	totalCount,
	onCompose,
	onAssignToLists,
	onRemoveFromList,
	onRestore,
	onDelete,
	isTrashFolder,
	isDeletable,
	isOffline
}) {
	return (
		<section class={style.sidePane}>
			<h2>
				<Text
					id="contacts.actions.heading"
					fields={{
						selectedCount,
						total: totalCount
					}}
				/>
			</h2>
			<ul class={style.actionItemList}>
				<li>
					<ActionItem
						icon="envelope"
						name={<Text id="contacts.actions.email.title" />}
						description={<Text id="contacts.actions.email.description" />}
						buttonText={<Text id="contacts.actions.email.buttonText" />}
						onClick={onCompose}
					/>
				</li>

				<li>
					<ActionItem
						icon="list-ul"
						iconClass="iconAssign"
						name={<Text id="contacts.actions.assign.title" />}
						description={<Text id="contacts.actions.assign.description" />}
						buttonText={<Text id="contacts.actions.assign.buttonText" />}
						onClick={onAssignToLists}
						disabled={isOffline}
					/>
				</li>

				{onRemoveFromList && (
					<li>
						<ActionItem
							icon="remove-list"
							iconClass="iconRemove"
							name={<Text id="contacts.actions.remove.title" />}
							description={<Text id="contacts.actions.remove.description" />}
							buttonText={<Text id="contacts.actions.remove.buttonText" />}
							onClick={onRemoveFromList}
							disabled={isOffline}
						/>
					</li>
				)}

				{isTrashFolder && (
					<li>
						<ActionItem
							icon="refresh"
							name={<Text id="contacts.actions.restore.title" />}
							description={<Text id="contacts.actions.restore.description" />}
							buttonText={<Text id="contacts.actions.restore.buttonText" />}
							onClick={onRestore}
							disabled={isOffline}
						/>
					</li>
				)}
				{isDeletable && (
					<li>
						{isTrashFolder ? (
							<ActionItem
								icon="trash"
								name={<Text id="contacts.actions.delete.titlePermanent" />}
								description={<Text id="contacts.actions.delete.descriptionPermanent" />}
								buttonText={<Text id="contacts.actions.delete.buttonText" />}
								onClick={onDelete}
								disabled={isOffline}
							/>
						) : (
							<ActionItem
								icon="trash"
								name={<Text id="contacts.actions.delete.title" />}
								description={<Text id="contacts.actions.delete.description" />}
								buttonText={<Text id="contacts.actions.delete.buttonText" />}
								onClick={onDelete}
								disabled={isOffline}
							/>
						)}
					</li>
				)}
			</ul>
		</section>
	);
}

function ActionItem({ icon, iconClass = '', name, description, buttonText, onClick, disabled }) {
	return (
		<div class="media">
			<Icon class={cx('figure', style.icon, style[iconClass])} name={icon} />
			<div class={cx('content', style.itemContent)}>
				<h3>{name}</h3>
				<p>{description}</p>
				<Button onClick={onClick} disabled={disabled} class={cx(disabled && style.disabledAction)}>
					{buttonText}
				</Button>
			</div>
		</div>
	);
}
