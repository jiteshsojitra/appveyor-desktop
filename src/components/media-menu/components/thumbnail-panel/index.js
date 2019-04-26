import { h } from 'preact';
import style from './style';
import cx from 'classnames';

export default function ThumbnailPanel(props) {
	return <div {...props} class={cx(style.container, props.class)} />;
}
