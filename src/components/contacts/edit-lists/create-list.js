import { h, Component } from 'preact';
import linkState from 'linkstate';
import { Localizer, Text } from 'preact-i18n';
import { withCreateContactList } from '../../../graphql-decorators/contact/create-modify-list';
import cx from 'classnames';
import style from './style';

@withCreateContactList()
export default class CreateList extends Component {
	create = () => {
		const { createContactList, onCreate } = this.props,
			{ name } = this.state;

		if (!name) return;

		this.setState({ working: true, error: null });

		createContactList({
			groupName: name
		})
			.then(({ data: { createContactList: contactList } }) => {
				this.setState({
					working: false,
					name: ''
				});

				onCreate && onCreate(contactList);
			})
			.catch(error => {
				console.error(error);

				this.setState({
					working: false,
					error
				});
			});
	};

	dismissError = () => {
		this.setState({ error: null });
	};

	render({ createContactList, onCreate, ...props }, { name, working, error }) {
		return (
			<form
				{...props}
				class={cx(props.class, style.createList, error && style.hasError)}
				onSubmit={this.create}
				action="javascript:"
			>
				<Localizer>
					<input
						class={style.createListInput}
						value={name}
						onInput={linkState(this, 'name')}
						disabled={working}
						pattern='^[^"/:]+$'
						placeholder={<Text id="contacts.editLists.NEW_LIST" />}
					/>
				</Localizer>

				{error && (
					<span class={style.error} onClick={this.dismissError}>
						{error}
					</span>
				)}
			</form>
		);
	}
}
