import { h } from 'preact';
import cx from 'classnames';
import ExternalHeaderItem from '../external-header-item';
import { configure } from '../../config';
import s from './style.less';

export default configure('nav.home,nav.left,nav.right')(
	({ className, home = {}, left = [], right = [], ...rest }) => (
		<div {...rest} className={cx(s.externalHeader, className)}>
			<div className="dib">
				<ExternalHeaderItem href={home.href}>
					{home.logo && (
						<div className={s.externalLogo}>
							<img src={home.logo} alt={home.alt} />
						</div>
					)}
					{home.name}
				</ExternalHeaderItem>
				{left.map(({ name, href }) => (
					<ExternalHeaderItem href={href}>{name}</ExternalHeaderItem>
				))}
			</div>

			<div className={s.externalHeaderRight}>
				{right.map(({ name, href }) => (
					<ExternalHeaderItem href={href}>{name}</ExternalHeaderItem>
				))}
			</div>
		</div>
	)
);
