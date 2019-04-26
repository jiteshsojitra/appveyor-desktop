import { h, Component } from 'preact';
import cx from 'classnames';
import { callWith } from '../../lib/util';
import s from './style';

const MAIL_TYPES = ['Messages', 'Photos', 'Documents'];

export default class MailTypeTabs extends Component {
	state = {
		selected: ''
	};

	handleClick = ({ type, key }) => {
		this.setState({ ...this.state, selected: key }, () => this.props.handleSetPane(type));
	};

	componentWillMount = () => this.setState({ ...this.state, selected: 'typeMessages' });

	render = ({}, { selected }) => (
		<ul class={s.tabs}>
			{MAIL_TYPES.map(type => {
				const key = `type${type}`;
				return (
					<li
						key={key}
						class={cx(s.tabItem, selected === key && s.selectedItem)}
						onClick={callWith(this.handleClick, { type, key })}
					>
						{type}
					</li>
				);
			})}
		</ul>
	);
}
