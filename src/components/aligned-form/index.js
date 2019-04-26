import { h } from 'preact';
import cx from 'classnames';
import s from './style.less';

const AlignedForm = props => <div {...props} class={cx(s.alignedForm, props.class)} />;

export default AlignedForm;
