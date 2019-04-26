import { h, Component } from 'preact';
import ModalDialog from '../modal-dialog';
import ModalDrawer from '../modal-drawer';
import ModalDrawerToolbar from '../modal-drawer-toolbar';
import { Button, ChoiceInput, Spinner } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import withMediaQuery from '../../enhancers/with-media-query';
import { minWidth, screenMd } from '../../constants/breakpoints';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../../constants/locale';
import style from './style';
import { graphql } from 'react-apollo';
import GetAvailableLocales from '../../graphql/queries/get-locales.graphql';
import linkState from 'linkstate';
@graphql(GetAvailableLocales, {
	props: ({ data: { getAvailableLocales, loading } }) => ({
		availableLocales:
			getAvailableLocales &&
			getAvailableLocales.filter(locale => SUPPORTED_LOCALES.indexOf(locale.id) !== -1),
		isAvailableLocalesLoading: loading
	})
})
@withMediaQuery(minWidth(screenMd), 'matchesScreenMd')
export class LanguageModal extends Component {
	state = {
		prefValue:
			SUPPORTED_LOCALES.indexOf(this.props.zimbraPrefLocale) !== -1
				? this.props.zimbraPrefLocale
				: DEFAULT_LOCALE
	};

	handleCloseDrawer = () => {
		this.setState({ isDrawerMounted: false });
		this.props.onClose();
	};

	onSave = e => {
		e.stopPropagation();
		const { prefValue } = this.state;
		prefValue && this.props.onLanguageChange(prefValue);
	};

	render(
		{ onClose, matchesScreenMd, availableLocales, isAvailableLocalesLoading },
		{ isDrawerMounted, prefValue }
	) {
		const [ComponentClass, componentClassProps] = matchesScreenMd
			? [ModalDialog, { autofocusChildIndex: 1 }]
			: [
					ModalDrawer,
					{
						mounted: isDrawerMounted,
						toolbar: (
							<ModalDrawerToolbar
								buttons={[
									<Button
										styleType="primary"
										brand="primary"
										onClick={this.onSave}
										disabled={!availableLocales}
									>
										<Text id="buttons.save" />
									</Button>
								]}
								onClose={this.handleCloseDrawer}
							/>
						)
					}
			  ];

		return (
			<ComponentClass
				{...componentClassProps}
				class={style.languageModal}
				contentClass={style.languageModalContent}
				title={`languageModal.title`}
				disablePrimary={!availableLocales}
				buttons={[
					<Button
						styleType="primary"
						brand="primary"
						onClick={this.onSave}
						disabled={!availableLocales}
					>
						<Text id="buttons.save" />
					</Button>
				]}
				onClickOutside={onClose}
			>
				<ul class={style.languageList}>
					{availableLocales && !isAvailableLocalesLoading ? (
						availableLocales.map(({ id, localName, name }) => (
							<li key={id}>
								<label class={style.label}>
									<ChoiceInput
										type="radio"
										value={id}
										onChange={linkState(this, 'prefValue', 'target.value')}
										checked={prefValue === id}
									/>
									<span class={style.labelText}>{`${localName} - ${name}`}</span>
								</label>
							</li>
						))
					) : (
						<li class={style.loaderWrapper}>
							<Spinner block class={style.spinner} />
						</li>
					)}
				</ul>
			</ComponentClass>
		);
	}
}
