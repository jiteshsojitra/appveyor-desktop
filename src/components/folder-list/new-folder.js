import { h, Component } from 'preact';

import FolderInput from '../folder-input';

export default class NewFolder extends Component {
	state = {
		value: ''
	};

	handleChange = e => {
		this.setState({ value: e.target.value });
	};

	render(props, { value }) {
		return (
			<FolderInput
				{...props}
				onInput={this.handleChange}
				value={value}
				placeholderTextId="mail.folders.ADD_NEW_PLACEHOLDER"
			/>
		);
	}
}
