import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { configure } from '../../config';
import style from './style.less';

@configure({ urlSlug: 'routes.slugs.email' })
export default class ComposeButton extends Component {
	render({ urlSlug }) {
		return (
			<a class={style.compose} href={`/${urlSlug}/new`}>
				<Text id="buttons.newMessage" />
			</a>
		);
	}
}
