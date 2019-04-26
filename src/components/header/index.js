import { h } from 'preact';
import { Link } from 'preact-router/match';
import cx from 'classnames';
import Search from '../search';
import { configure } from '../../config';

import HeaderActions from '../header-actions';

import ClientLogo from '../client-logo';

import s from './style.less';

const PrimaryLogo = () => (
	<Link className={s.primaryLogo} href="/">
		<div className={s.primaryLogoInner}>
			<ClientLogo />
		</div>
	</Link>
);

@configure('searchInline')
export default class Header {
	render({ searchInline, className, ...props }) {
		return (
			<div
				{...props}
				role="banner"
				className={cx(s.header, className, !searchInline && s.headerSearch)}
			>
				<PrimaryLogo />
				{!searchInline && <Search showDropDown searchInline={searchInline} />}
				<HeaderActions />
			</div>
		);
	}
}
