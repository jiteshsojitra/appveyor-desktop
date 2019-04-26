import { h, Component } from 'preact';
import { getName, getAttachedImageUrl } from '../../utils/contacts';
import { ChoiceInput } from '@zimbra/blocks';
import Avatar from '../avatar';
import cx from 'classnames';
import style from './style';
import { configure } from '../../config';
import getContext from '../../lib/get-context';
import { withProps } from 'recompose';
import get from 'lodash-es/get';

@configure('zimbraOrigin')
@getContext(({ zimbraBatchClient }) => ({ zimbraBatchClient }))
@withProps(({ contact, zimbraOrigin, zimbraBatchClient }) => ({
	imageURL: get(contact, 'attributes')
		? getAttachedImageUrl(contact, zimbraOrigin, zimbraBatchClient)
		: ''
}))
export default class ContactPickerContact extends Component {
	select = () => {
		const { contact, onClick } = this.props;
		onClick(contact);
	};

	render({
		contact,
		contact: { inoperable, attributes, attributes: { email } = {} } = {},
		selected,
		imageURL
	}) {
		const contactName = getName(attributes);

		return (
			<div
				class={cx(style.contact, selected && style.selected, inoperable && style.inoperable)}
				onClick={this.select}
			>
				<div class={style.flexItem}>
					<ChoiceInput checked={selected} readOnly />
				</div>
				<div class={style.flexItem}>
					<Avatar class={style.avatar} contact={contact} profileImageURL={imageURL} />
				</div>
				<div class={cx(style.flexItem)}>
					<strong title={contactName}>{contactName}</strong>
				</div>
				<div class={cx(style.flexItem, style.contactFields, style.emailField)}>
					<span title={email}>{email}</span>
				</div>
			</div>
		);
	}
}
