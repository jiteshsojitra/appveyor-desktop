import { h, Component } from 'preact';

import cx from 'classnames';
import style from './style.less';

export default class ToolbarPortalTarget extends Component {
	// If we rerender we blow away whatever content has been portaled and
	// the diff algo chokes.
	shouldComponentUpdate() {
		return false;
	}
	render() {
		return (
			<div class={cx(style.hideMdUp, style.nav, style.mobileNav)} id="app-navigation-toolbar" />
		);
	}
}
