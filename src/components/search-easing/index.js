import { h, Component } from 'preact';
import { route } from 'preact-router';
import cx from 'classnames';
import ToolbarActionButton from '../toolbar/action-button';

import Search from '../search';

import s from './style.less';
import { connect } from 'preact-redux';
import { setShowAdvanced } from '../../store/navigation/actions';
import { setActiveSearch } from '../../store/search/actions';

export default function SearchEasing({ localSearch, open, onClose, showAdvanced, autofocus }) {
	return (
		<div className={cx(s.searchEasingHeader, open && s.show)}>
			{open && [
				<Search
					showDropDown={false}
					showAdvanced={showAdvanced}
					localSearch={localSearch}
					hideClearButton
					searchInline
					autofocus={autofocus}
				/>,
				<ToolbarActionButton onClick={onClose} className={s.closeSearch} icon="close" />
			]}
		</div>
	);
}

@connect(
	state => ({
		showAdvanced: state.navigation.showAdvanced
	}),
	{ setShowAdvanced, setActiveSearch }
)
export class SearchEasingButton extends Component {
	state = {
		open: this.props.open
	};

	openSearchInput = () => {
		this.setState({ open: true, autofocus: true });
	};

	closeSearchInput = () => {
		this.setState({ open: false, autofocus: false });
		if (this.props.setShowAdvanced) {
			this.props.setShowAdvanced({ show: false });
			this.props.setActiveSearch(null);
		}
		route('/');
	};

	handleClick = e => {
		this.openSearchInput();
		this.props.onClick && this.props.onClick(e);
	};

	componentWillReceiveProps(nextProps) {
		this.setState({ open: Boolean(nextProps.showAdvanced) });
		if (nextProps.open && nextProps.open !== this.state.open) {
			this[`${nextProps.open ? 'open' : 'close'}SearchInput`]();
		}
	}
	render({ showAdvanced }, { open, autofocus }) {
		return (
			<span>
				<ToolbarActionButton onClick={this.openSearchInput} icon="search" />
				<SearchEasing
					open={open}
					autofocus={autofocus}
					showAdvanced={showAdvanced}
					onClose={this.closeSearchInput}
				/>
			</span>
		);
	}
}
