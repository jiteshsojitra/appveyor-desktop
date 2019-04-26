import { h, Component } from 'preact';
import get from 'lodash-es/get';
import AddEditDelegatesDialog from './add-edit-delegates-dialog';
import { addressFromContact } from '../../../../utils/contacts';
import { withStateHandlers } from 'recompose';
import withSearchGal from '../../../../graphql-decorators/search/search-gal';

@withStateHandlers(
	{ isDialogOpen: false },
	{
		onOpenDialog: () => () => ({ isDialogOpen: true }),
		onCloseDialog: () => () => ({ isDialogOpen: false })
	}
)
@withSearchGal({
	skip: ({ isDialogOpen, address }) => !isDialogOpen || !address,
	options: ({ address }) => ({
		variables: {
			name: address,
			type: 'account',
			limit: 1
		}
	}),
	props: ({ data: { searchGal, ...data } }) => ({
		...data,
		contact: get(searchGal, 'contacts.0')
	})
})
export default class OpenAddEditDelegatesButton extends Component {
	render({
		isDialogOpen,
		onOpenDialog,
		onCloseDialog,
		address,
		sendAsRight,
		sendOnBehalfOfRight,
		contact,
		children,
		...props
	}) {
		return (
			<span class={props.class}>
				<a href="javascript:" onClick={onOpenDialog}>
					{children}
				</a>
				{isDialogOpen && (
					<AddEditDelegatesDialog
						sendAsRight={sendAsRight}
						sendOnBehalfOfRight={sendOnBehalfOfRight}
						value={contact ? [addressFromContact(contact)] : address && [{ address }]}
						onClose={onCloseDialog}
						disableInput={!!address}
					/>
				)}
			</span>
		);
	}
}
