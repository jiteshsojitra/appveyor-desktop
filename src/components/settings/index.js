import { h } from 'preact';
import { Spinner } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import values from 'lodash-es/values';
import set from 'lodash-es/set';
import get from 'lodash-es/get';
import castArray from 'lodash-es/castArray';
import cloneDeep from 'lodash-es/cloneDeep';
import PureComponent from '../../lib/pure-component';
import { pluck, callWith } from '../../lib/util';
import cx from 'classnames';
import style from './style';
import { VIEWING_EMAIL_SETTINGS } from './constants';
import { minWidth, screenSm, screenXsMax } from '../../constants/breakpoints';
import withMediaQuery from '../../enhancers/with-media-query/index';

@withMediaQuery(minWidth(screenSm), 'matchesScreenSm')
@withMediaQuery(minWidth(screenXsMax), 'matchesScreenXsMax')
export default class Settings extends PureComponent {
	openItem = id => {
		this.setState({ activeId: id });
		this.props.onChangeActiveId && this.props.onChangeActiveId(id);

		if (this.activeScreenAfterNavigation) {
			this.activeScreenAfterNavigation(id);
		}
	};

	registerAfterNavigation = fn => {
		this.activeScreenAfterNavigation = fn;
	};

	onFieldChange = fieldNames => e =>
		this.props.onChange(
			castArray(fieldNames).reduce((value, fieldName, index) => {
				const fieldPath = `${this.state.activeId}.${fieldName}`;
				let fieldValue;

				if (e instanceof Array) {
					fieldValue = e[index];
				} else {
					fieldValue =
						e.target.tagName === 'INPUT' && e.target.type === 'checkbox'
							? !get(value, fieldPath)
							: e.target.value;
				}

				return set(cloneDeep(value), fieldPath, fieldValue);
			}, this.props.value)
		);

	// Re-use the cached closed-over field change handler if one exists. Immediately
	// invoke the proxy returned by `callWith` as we want the underlying event handler
	// fn.
	callWithOnFieldChange = fieldName => callWith(this.onFieldChange, fieldName)();

	constructor(props) {
		super();
		this.state = {
			activeId: props.matchesScreenSm ? VIEWING_EMAIL_SETTINGS.id : null
		};
	}

	componentDidMount() {
		this.props.onChangeActiveId && this.props.onChangeActiveId(this.state.activeId);
	}

	componentWillReceiveProps({ activeId }) {
		if (this.props.activeId !== activeId && this.state.activeId !== activeId) {
			this.setState({ activeId });
		}
	}

	render(
		{
			value,
			updateAccountSettings,
			accounts,
			accountInfoQuery,
			onSubmitNewAccount,
			accountChangeEvent,
			setLocalBrowserKey,
			masterSettingsConfig
		},
		{ activeId }
	) {
		const settingsTab = pluck(values(masterSettingsConfig), 'id', activeId);

		return (
			<div class={cx(style.settings)}>
				<div class={cx(style.sidebar, activeId && style.activePanel)}>
					<nav class={style.sidebarMenu}>
						{masterSettingsConfig.map(({ id, hide, title }) => (
							<a
								href="javascript:"
								class={cx(
									style.sidebarItem,
									activeId === id && style.active,
									hide && hide(this.props) && style.hide
								)}
								onClick={callWith(this.openItem, id)}
							>
								{title ? title : <Text id={`settings.${id}.title`} />}
							</a>
						))}
					</nav>
				</div>
				{activeId && (
					<div
						class={cx(
							style.settingsWrapper,
							style.remainderWidthColumn,
							activeId && style.activePanel
						)}
					>
						{!value ? (
							<Spinner block />
						) : (
							h(settingsTab.component, {
								onFieldChange: this.callWithOnFieldChange,
								value: value[activeId],
								setLocalBrowserKey,
								...(activeId === 'accounts' || activeId === 'signatures'
									? {
											onSubmitNewAccount,
											updateAccountSettings,
											accounts,
											accountInfoQuery,
											accountChangeEvent,
											afterNavigation: this.registerAfterNavigation
									  }
									: {})
							})
						)}
					</div>
				)}
			</div>
		);
	}
}
