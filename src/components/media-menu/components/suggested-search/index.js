import { h, Component } from 'preact';
import { Icon } from '@zimbra/blocks';
import style from './style';
import cx from 'classnames';

export class SuggestedSearch extends Component {
	handleClick = () => {
		const { onClick, children } = this.props;
		if (typeof onClick === 'function') {
			onClick(children.join(''));
		}
	};

	render({ children, onClick, ...props }) {
		return (
			<button {...props} onClick={this.handleClick} class={cx(style.suggestedSearch, props.class)}>
				<Icon name="search" />
				{children}
			</button>
		);
	}
}

export function SuggestionGroup({ tags, onClick, ...props }) {
	return (
		<div {...props} class={cx(style.suggestionGroup, props.class)}>
			{tags.map(tag => (
				<SuggestedSearch onClick={onClick}>{tag}</SuggestedSearch>
			))}
		</div>
	);
}
