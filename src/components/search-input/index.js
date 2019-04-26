import { h, Component } from 'preact';
import { withText, Text, Localizer } from 'preact-i18n';
import { connect } from 'preact-redux';
import { searchList } from '../../store/search/actions';
import cx from 'classnames';
import { withStateHandlers, withProps } from 'recompose';
import get from 'lodash-es/get';
import { KeyCodes, Icon } from '@zimbra/blocks';
import { getEmail } from '../../utils/contacts';
import ZimletSlot from '../zimlet-slot';
import SearchAdvanced from '../search-advanced';
import ContactSuggestion from '../contact-suggestion';
import ContactTag from './contact-tag';
import withAutoComplete from '../../graphql-decorators/autocomplete';

import s from './style.less';

const byRank = (a, b) => b.ranking - a.ranking;
const hasEmail = c => c.email;
const isNotContactGroup = c => !c.isGroup;

@withText({
	placeholderWithContact: 'search.placeholderWithContact',
	emailPlaceholderType: 'search.placeholderTypes.mail',
	calendarPlaceholderType: 'search.placeholderTypes.calendar',
	contactsPlaceholderType: 'search.placeholderTypes.contacts'
})
@connect(state => ({
	showAdvanced: get(state, 'navigation.showAdvanced')
}))
@withStateHandlers(({ value }) => ({ value: value || '' }), {
	setValue: () => value => ({ value })
})
@withAutoComplete()
@withProps(({ contactSuggestions }) => ({
	contactSuggestions: contactSuggestions && contactSuggestions.filter(isNotContactGroup)
}))
export default class SearchInput extends Component {
	state = {
		focused: false,
		hideSuggestions: false,
		selectedContact: null,
		keyboardSelectionIndex: null,
		contactFocused: false
	};

	submit = (query, contact, email) => {
		this.props.onSubmit(query, contact ? getEmail(contact) : email);
		this.setState({ selectedContact: contact });
		if (contact) {
			this.props.setValue('');
		}
	};

	keyboardSelectedContact = () => {
		const { contactSuggestions } = this.props;
		const { keyboardSelectionIndex } = this.state;

		if (contactSuggestions && keyboardSelectionIndex !== null) {
			return contactSuggestions[keyboardSelectionIndex];
		}

		return null;
	};

	handleKeyDown = e => {
		switch (e.keyCode) {
			case KeyCodes.DOWN_ARROW:
				return this.handleInputDown(e);
			case KeyCodes.UP_ARROW:
				return this.handleInputUp(e);
			case KeyCodes.ESCAPE:
				return this.handleInputEsc(e);
			default:
				return;
		}
	};

	handleKeyUp = e => {
		switch (e.keyCode) {
			case KeyCodes.BACKSPACE:
				return this.handleKeyUpBackspace(e);
		}
	};

	handleInput = ({ target: { value } }) => {
		if (value !== this.props.value) {
			this.handleSearchValueChange(value);
			this.setState({
				focused: true,
				keyboardSelectionIndex: null,
				contactFocused: false
			});
		}
	};

	handleInputDown = e => {
		e.preventDefault();
		if (this.props.contactSuggestions) {
			const i = this.state.keyboardSelectionIndex;
			this.setState({
				keyboardSelectionIndex: Math.min(
					i !== null ? i + 1 : 0,
					this.props.contactSuggestions.length - 1
				)
			});
		}
	};

	handleInputUp = e => {
		e.preventDefault();
		if (this.props.contactSuggestions) {
			const i = this.state.keyboardSelectionIndex;
			this.setState({
				keyboardSelectionIndex: Math.max(i !== null ? i - 1 : 0, 0)
			});
		}
	};

	handleKeyUpBackspace = e => {
		const { selectionStart, selectionEnd } = e.target;

		if (this.props.email) {
			// If there is an active email, pressing backspace once will select it and twice will delete it.
			if (this.state.contactFocused) {
				this.submit('', null);
			} else if (selectionStart === 0 && selectionEnd === 0) {
				this.setState({ contactFocused: true });
			}
		}
	};

	handleInputEsc = () => {
		this.setState({
			focused: !this.state.focused,
			keyboardSelectionIndex: null
		});
	};

	handleSubmit = e => {
		e.preventDefault();
		if (!this.props.localSearch) {
			const contact = this.keyboardSelectedContact();
			const contactEmail = contact ? getEmail(contact) : null;
			const prevEmail = this.props.email;
			const value = contactEmail && contactEmail !== get(prevEmail, 'id') ? '' : this.props.value;

			this.submit(value, contact, prevEmail);
			this.setFocus(false);
		}
	};

	handleFocus = () => {
		this.setFocus(true);
	};

	handleBlur = () => {
		this.setFocus(false);
		this.handleSearchValueChange(this.props.value);
	};

	handleContactClick = contact => {
		this.submit('', contact);
	};

	handleRemoveContact = () => {
		this.submit(this.props.value, null);
		this.input.focus();
	};

	handleClickClearButton = () => {
		this.handleSearchValueChange('');
		this.submit('', null);
		this.input.focus();
	};

	setFocus = val => {
		this.setState({
			focused: val,
			keyboardSelectionIndex: val ? this.state.keyboardSelectionIndex : null
		});
		val ? this.props.onFocus() : this.props.onBlur();
	};

	handleSearchValueChange(value) {
		this.props.setValue(value);
		if (this.props.localSearch) {
			this.props.dispatch(searchList(value));
			this.props.handleSearchValueChange(value);
		}
	}

	static defaultProps = {
		onFocus: () => {},
		onBlur: () => {}
	};

	componentWillMount() {
		this.handleSearchValueChange(this.props.value);
	}

	componentDidMount() {
		if (this.props.autofocus) {
			this.input.focus();
		}
	}

	componentWillReceiveProps(nextProps) {
		if (this.props.email && !nextProps.email) {
			this.setState({ selectedContact: null });
		}
		if (this.props.autofocus !== true && nextProps.autofocus === true) {
			this.input.focus();
		}
	}

	render(
		{
			searchInline,
			hideClearButton,
			disableContactSuggestions,
			email,
			contact,
			pathType,
			contactSuggestions,
			value,
			onHideAdvanced,
			queryOptions,
			activeSearchFolder,
			showAdvanced
		},
		{ focused, contactFocused, selectedContact, keyboardSelectionIndex }
	) {
		const fieldType =
			pathType === null || pathType === 'message' || pathType === 'conversation'
				? this.props.emailPlaceholderType
				: this.props[`${pathType}PlaceholderType`];
		const searchValue = activeSearchFolder && queryOptions ? queryOptions.query : value;

		return (
			<div class={s.container}>
				<form class={cx(s.form, searchInline && s.sectionSearch)} onSubmit={this.handleSubmit}>
					{email && (
						<ContactTag
							contact={contact || selectedContact}
							email={email}
							focused={contactFocused}
							onRemove={this.handleRemoveContact}
							className={s.contactTag}
						/>
					)}
					<ZimletSlot name="searchInputPlaceholder" pathType={pathType}>
						{zimletResponses => {
							const zimletText = zimletResponses && zimletResponses.filter(Boolean)[0];
							return (
								<Localizer>
									<input
										type="text"
										ref={ref => (this.input = ref)}
										placeholder={
											<Text id="search.placeholder" fields={{ type: zimletText || fieldType }} />
										}
										class={s.input}
										value={searchValue}
										onKeyDown={this.handleKeyDown}
										onKeyUp={this.handleKeyUp}
										onInput={this.handleInput}
										onFocus={this.handleFocus}
										onBlur={this.handleBlur}
										autocomplete="off"
									/>
								</Localizer>
							);
						}}
					</ZimletSlot>
					<Localizer>
						<button
							aria-label={<Text id="buttons.clear" />}
							onClick={this.handleClickClearButton}
							type="button"
							className={cx(s.clearBtn, (!value || hideClearButton) && s.hideButon)}
						>
							<Icon name="close" className={cx(searchInline && s.clearIconSize)} />
						</button>
					</Localizer>
					<button className={s.searchButton} type="submit" onClick={this.handleSubmit}>
						<Icon name="search" class={cx(focused && s.activeButton)} />
					</button>
				</form>

				{!disableContactSuggestions &&
					focused &&
					contactSuggestions &&
					contactSuggestions.length > 0 && (
						<div class={s.suggestions}>
							{contactSuggestions
								.filter(hasEmail)
								.sort(byRank)
								.map((c, i) => (
									<ContactSuggestion
										class={cx(
											s.contactSuggestion,
											keyboardSelectionIndex === i && s.contactSuggestionSelected
										)}
										nameClass={s.contactSuggestionName}
										contact={c}
										input={value || ''}
										onClick={this.handleContactClick}
									/>
								))}
						</div>
					)}

				{showAdvanced && (
					<SearchAdvanced
						onHideAdvanced={onHideAdvanced}
						value={value || email}
						queryOptions={queryOptions}
						activeSearchFolder={activeSearchFolder}
					/>
				)}
			</div>
		);
	}
}
