import { h, Component } from 'preact';
import { Text } from 'preact-i18n';
import { route } from 'preact-router';
import { Button, ChoiceInput } from '@zimbra/blocks';
import cx from 'classnames';
import { connect } from 'preact-redux';
import moment from 'moment';
import queryString from 'query-string';
import isEmpty from 'lodash-es/isEmpty';
import linkState from 'linkstate';
import AlignedForm from '../aligned-form';
import AlignedLabel from '../aligned-form/label';
import DateInput from '../date-input';
import AddressField from '../address-field';
import FormGroup from '../form-group';
import Select from '../select';
import getMailFolders from '../../graphql-decorators/get-mail-folders';
import {
	getView,
	getSearchQuery,
	getSearchFolder,
	getAdvancedSearchOptions
} from '../../store/url/selectors';
import { parseAddress } from '../../lib/util';
import { specialFolders, customFolders } from '../../utils/folders';
import { notify } from '../../store/notifications/actions';
import CloseButton from '../close-button';

import style from './style';
import { withModifySearchFolder } from '../../graphql-decorators/modify-search-folder';
import { UpdatedSmartFolderQuery } from '../notifications/messages';
import { getSearchQueryString } from '../../utils/search';

const VIEW_TO_SEARCH = {
	conversation: 'email',
	message: 'email'
};

@getMailFolders()
@withModifySearchFolder()
@connect(
	state => ({
		currentView: getView(state),
		query: getSearchQuery(state),
		urlOpts: getAdvancedSearchOptions(state),
		searchFolder: getSearchFolder(state)
	}),
	{ notify }
)
export default class SearchAdvanced extends Component {
	state = {
		showCustomDateRange: false,
		selectedFolder: undefined,
		fromDate: new Date(),
		untilDate: new Date(),
		dateTypeValue: 'anytime',
		subject: '',
		contains: '',
		toValue: [],
		fromValue: [],
		hasImage: false,
		hasAttachment: false,
		allFolders: [],
		expanded: false
	};

	getAfterDateValue = () => {
		const { fromDate, dateTypeValue } = this.state;
		if ('anytime' === dateTypeValue) {
			return undefined;
		}

		return encodeURI(moment(fromDate).format('MM/DD/YYYY'));
	};

	getBeforeDateValue = () => {
		const { untilDate, dateTypeValue } = this.state;
		if ('anytime' === dateTypeValue) {
			return undefined;
		}

		return encodeURI(moment(untilDate).format('MM/DD/YYYY'));
	};

	getSelectedFolder = () => {
		const { selectedFolder } = this.state;
		let folder;

		if (!isEmpty(selectedFolder)) {
			folder = selectedFolder.name;
		}

		return folder;
	};

	getFrom = () => {
		const { fromValue } = this.state;

		if (!isEmpty(fromValue)) {
			return encodeURI(fromValue.map(({ address }) => address).join(','));
		}

		return undefined;
	};

	getTo = () => {
		const { toValue } = this.state;

		if (!isEmpty(toValue)) {
			return encodeURI(toValue.map(({ address }) => address).join(','));
		}

		return undefined;
	};

	handleSubmitSearch = () => {
		const {
			currentView,
			query,
			onHideAdvanced,
			queryOptions,
			activeSearchFolder,
			value
		} = this.props;
		const view = VIEW_TO_SEARCH[currentView] || currentView;
		const types = currentView === 'calendar' ? 'appointment,task' : 'conversation';

		const qObject = {
			q: queryOptions ? queryOptions.query : query || value || undefined,
			types,
			folder: this.getSelectedFolder(),
			subject: this.state.subject || undefined,
			contains: this.state.contains || undefined,
			after: this.getAfterDateValue(),
			before: this.getBeforeDateValue(),
			dateTypeValue: this.state.dateTypeValue,
			from: this.getFrom(),
			to: this.getTo(),
			hasAttachment: this.state.hasAttachment.toString() || false,
			hasImage: this.state.hasImage.toString() || false
		};

		onHideAdvanced();
		if (queryOptions) {
			const updatedQuery = getSearchQueryString({ ...qObject, query: qObject.q });
			this.props
				.modifySearchFolder({
					id: activeSearchFolder.id,
					query: updatedQuery,
					types
				})
				.then(() => {
					this.props.notify({
						message: <UpdatedSmartFolderQuery />
					});
				});
		} else {
			const qString = queryString.stringify(qObject);
			route(`/search/${view}/?${qString}`);
		}
	};

	handleSubmit = e => {
		e.preventDefault();
		this.onSearchInChanged();
		this.handleSubmitSearch();
	};

	onDateChange = e => {
		const option = e.target.value;
		switch (option) {
			case 'anytime': {
				this.setState({ showCustomDateRange: false, dateTypeValue: option });
				break;
			}

			case 'last7': {
				this.setState({
					showCustomDateRange: false,
					dateTypeValue: option,
					fromDate: moment()
						.subtract(7, 'days')
						.toDate(),
					untilDate: moment().toDate()
				});
				break;
			}

			case 'last30': {
				this.setState({
					showCustomDateRange: false,
					dateTypeValue: option,
					fromDate: moment()
						.subtract(30, 'days')
						.toDate(),
					untilDate: moment().toDate()
				});
				break;
			}

			case 'customdate': {
				this.setState({ showCustomDateRange: true, dateTypeValue: option });
				break;
			}

			default: {
				this.setState({ showCustomDateRange: false, dateTypeValue: 'anytime' });
				break;
			}
		}
	};

	handleFromOnDateChange = date => {
		const fromDate = moment(date);
		const untilDate = moment(this.state.untilDate);
		if (fromDate.isValid() && untilDate.isValid()) {
			if (moment(untilDate).isBefore(fromDate)) {
				this.setState({
					fromDate: fromDate.toDate(),
					untilDate: moment(date)
						.endOf('day')
						.toDate()
				});
			} else {
				this.setState({ fromDate: fromDate.toDate() });
			}
		}
	};

	handleUntilDateOnChange = date => {
		const untilDate = moment(date).endOf('day');
		const fromDate = moment(this.state.fromDate);
		if (fromDate.isValid() && untilDate.isValid()) {
			if (moment(untilDate).isBefore(fromDate)) {
				this.setState({
					untilDate: untilDate.toDate(),
					fromDate: untilDate.toDate()
				});
			} else {
				this.setState({ untilDate: untilDate.toDate() });
			}
		}
	};

	onSearchInChanged = e => {
		if (e) {
			const option = e.target.value;
			const selectedFolder = this.state.allFolders.filter(folder => folder.id === option);
			this.setState({ selectedFolder: selectedFolder[0] });
		}
	};

	handleCalendarState = expanded => {
		this.setState(expanded);
	};

	getActiveSearchFolder = (allFolders, activeFolderName) => {
		let selectedFolder;
		if (!isEmpty(activeFolderName)) {
			selectedFolder = allFolders.filter(folder => folder.name === activeFolderName);
		} else {
			selectedFolder = allFolders.filter(folder => folder.id === '-1');
		}
		return selectedFolder[0];
	};

	getDataForState = opts => {
		const allFolders = [
			{ id: '-1', name: 'All' },
			...specialFolders(this.props.folders),
			...customFolders(this.props.folders)
		];

		const newState = {
			allFolders,
			subject: opts.subject,
			contains: opts.contains,
			dateTypeValue: opts.dateTypeValue,
			showCustomDateRange: opts.dateTypeValue === 'customdate',
			hasImage: opts.hasImage === 'true',
			hasAttachment: opts.hasAttachment === 'true'
		};

		if (!isEmpty(opts.to)) {
			const toAddrStr = opts.to.split(',');
			const toAddrArr = [];
			toAddrStr.forEach(addrStr => {
				const addrObj = parseAddress(addrStr);
				toAddrArr.push(addrObj);
			});

			newState.toValue = toAddrArr;
		}

		if (!isEmpty(opts.from)) {
			const fromAddrStr = opts.from.split(',');
			const fromAddrArr = [];
			fromAddrStr.forEach(addrStr => {
				const addrObj = parseAddress(addrStr);
				fromAddrArr.push(addrObj);
			});

			newState.fromValue = fromAddrArr;
		}

		let fromDate = new Date();
		if (!isEmpty(opts.after)) {
			fromDate = moment(opts.after, 'MM/DD/YYYY').toDate();
		}

		let untilDate = new Date();
		if (!isEmpty(opts.before)) {
			untilDate = moment(opts.before, 'MM/DD/YYYY').toDate();
		}

		newState.fromDate = fromDate;
		newState.untilDate = untilDate;
		newState.selectedFolder = opts.activeFolder
			? this.getActiveSearchFolder(allFolders, opts.activeFolder)
			: this.getActiveSearchFolder(allFolders, this.props.searchFolder);

		return newState;
	};

	componentWillMount() {
		const { queryOptions, urlOpts, activeSearchFolder } = this.props;
		const newState =
			activeSearchFolder && queryOptions
				? this.getDataForState(queryOptions)
				: this.getDataForState(urlOpts);
		this.setState(newState);
	}

	render(
		{ onHideAdvanced, queryOptions },
		{
			fromDate,
			untilDate,
			subject,
			contains,
			toValue,
			fromValue,
			dateTypeValue,
			allFolders,
			selectedFolder
		}
	) {
		return (
			<div>
				<div className={style.overlay} onClick={onHideAdvanced} />
				<div className={style.container}>
					<form onSubmit={this.handleSubmit}>
						<CloseButton class={style.close} onClick={onHideAdvanced} />
						<AlignedForm>
							<FormGroup compact>
								<AlignedLabel align="left" width="80px">
									<Text id="search.advanced.searchIn" />
								</AlignedLabel>

								<Select onChange={this.onSearchInChanged} value={selectedFolder.id} fullWidth>
									{allFolders.map(folder => (
										<option value={folder.id}>{folder.name}</option>
									))}
								</Select>
							</FormGroup>
							<FormGroup compact>
								<AlignedLabel align="left" width="80px">
									<Text id="search.advanced.from" />
								</AlignedLabel>
								<AddressField
									class={cx(style.contactSuggestInput, style.addressFieldInput)}
									tokenInputClass={style.tokenInput}
									tokenInputStyle={style.tokenInputStyle}
									value={fromValue}
									onChange={linkState(this, 'fromValue', 'value')}
								/>
							</FormGroup>

							<FormGroup compact>
								<AlignedLabel align="left" width="80px">
									<Text id="search.advanced.to" />
								</AlignedLabel>
								<AddressField
									class={cx(style.contactSuggestInput, style.addressFieldInput)}
									tokenInputClass={style.tokenInput}
									tokenInputStyle={style.tokenInputStyle}
									value={toValue}
									onChange={linkState(this, 'toValue', 'value')}
								/>
							</FormGroup>

							<FormGroup compact>
								<AlignedLabel align="left" width="80px">
									<Text id="search.advanced.subject" />
								</AlignedLabel>
								<input
									type="text"
									class={cx(style.textInput, style.block)}
									value={subject}
									onChange={linkState(this, 'subject')}
								/>
							</FormGroup>

							<FormGroup compact>
								<AlignedLabel align="left" width="80px">
									<Text id="search.advanced.contains" />
								</AlignedLabel>
								<input
									type="text"
									class={cx(style.textInput, style.block)}
									value={contains}
									onChange={linkState(this, 'contains')}
								/>
							</FormGroup>

							<FormGroup compact>
								<AlignedLabel align="left" width="80px">
									<Text id="search.advanced.date" />
								</AlignedLabel>
								<Select value={dateTypeValue} onChange={this.onDateChange} fullWidth>
									<option value="anytime">
										<Text id="search.advanced.dateRange.anytime" />
									</option>

									<option value="last7">
										<Text id="search.advanced.dateRange.last7" />
									</option>

									<option value="last30">
										<Text id="search.advanced.dateRange.last30" />
									</option>

									<option value="customdate">
										<Text id="search.advanced.dateRange.customDate" />
									</option>
								</Select>
							</FormGroup>

							{this.state.showCustomDateRange && (
								<FormGroup compact>
									<AlignedLabel align="left" width="80px" />
									<DateInput
										onDateChange={this.handleFromOnDateChange}
										class={style.inLineFieldRight}
										dateValue={fromDate}
									/>
									<Text id="search.advanced.dateTo" />
									<DateInput
										onDateChange={this.handleUntilDateOnChange}
										class={style.inLineFieldLeft}
										dateValue={untilDate}
									/>
								</FormGroup>
							)}

							<FormGroup compact>
								<div class={cx(style.indented, style.checkboxes)}>
									<div className={style.checkbox}>
										<ChoiceInput
											id="hasAttachment"
											onChange={linkState(this, 'hasAttachment')}
											checked={this.state.hasAttachment}
										/>
										<label for="hasAttachment">
											<Text id="search.advanced.hasAttachment" />
										</label>
									</div>

									<div className={style.checkbox}>
										<ChoiceInput
											id="hasImage"
											onChange={linkState(this, 'hasImage')}
											checked={this.state.hasImage}
										/>

										<label for="hasImage">
											<Text id="search.advanced.hasImage" />
										</label>
									</div>
								</div>
							</FormGroup>

							<FormGroup compact>
								<AlignedLabel align="left" width="80px" />
								<Button
									styleType="primary"
									type="submit"
									onClick={this.handleSubmit}
									class={style.submitButton}
								>
									<Text id={queryOptions ? 'buttons.updateSearch' : 'buttons.searchMail'} />
								</Button>
							</FormGroup>
						</AlignedForm>
					</form>
				</div>
			</div>
		);
	}
}
