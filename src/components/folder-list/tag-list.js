import { h } from 'preact';
import PureComponent from '../../lib/pure-component';
import FolderListItem from './item';
import wire from 'wiretie';
import { connect } from 'preact-redux';
import cx from 'classnames';
import style from './style';

@connect(({ email = {} }) => ({
	account: email.account
}))
@wire('zimbra', ({ account, lastUpdated }) => ({
	tags: account && ['tags.list', { lastUpdated }]
}))
export default class TagsList extends PureComponent {
	tagLink = tag => {
		const { urlSlug, urlPrefix, onDrop } = this.props;
		return (
			<FolderListItem
				folder={tag}
				dropTargetType="tag"
				depth={1}
				onDrop={onDrop}
				urlPrefix={urlPrefix == null ? 'tag:' : urlPrefix}
				urlSlug={urlSlug}
			/>
		);
	};

	render({ account, tags, label, urlSlug, urlPrefix, onDrop, lastUpdated, ...props }) {
		return (
			<div {...props} class={cx(style.folderList, style.tagList, props.class)}>
				{label && tags && tags.length > 0 && <div class={style.divider}>{label}</div>}

				{tags && tags.map(this.tagLink)}
			</div>
		);
	}
}
