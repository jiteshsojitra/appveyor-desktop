import { h } from 'preact';
import cx from 'classnames';
import style from './style.less';

export default function MailListFooter(props) {
	return <div {...props} class={cx(style.footer, props.class)} />;
}
