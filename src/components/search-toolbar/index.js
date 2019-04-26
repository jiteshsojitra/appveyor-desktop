import { h, Component } from 'preact';
import { Button } from '@zimbra/blocks';
import { Text } from 'preact-i18n';
import { connect } from 'preact-redux';
import get from 'lodash/get';
import MailTypeTabs from './mail-type-tabs';
import Search from '../search';
import { configure } from '../../config';
import { graphql } from 'react-apollo';
import GetFolder from '../../graphql/queries/folders/get-folder.graphql';
import s from './style.less';
import { CreatedSmartFolder } from '../../components/notifications/messages';
import { notify } from '../../store/notifications/actions';
import { showNotificationModal } from '../../store/notification-modal/actions';
import { withCreateSearchFolder } from '../../graphql-decorators/create-search-folder';
import { withDeleteFolder } from '../../graphql-decorators/tasks/folder-actions';
import { setShowAdvanced } from '../../store/navigation/actions';
import { SEARCH_TYPE } from '../../constants/search';
import { screenXsMax, maxWidth } from '../../constants/breakpoints';
import withMediaQuery from '../../enhancers/with-media-query';
import { faultCode } from '../../utils/errors';

@connect(
	state => ({
		showAdvanced: get(state, 'navigation.showAdvanced'),
		searchUrl: get(state, 'url.location.search')
	}),
	{
		notify,
		showNotificationModal,
		setShowAdvanced
	}
)
@withDeleteFolder()
@withCreateSearchFolder()
@graphql(GetFolder, {
	options: () => ({
		// Use the same variables as the main query to avoid hitting the network
		variables: {
			view: null
		}
	}),
	props: ({ data }) => ({
		allFolders: [
			...(get(data, 'getFolder.folders.0.folders') || []),
			...(get(data, 'getFolder.folders.0.search') || [])
		]
	})
})
@withMediaQuery(maxWidth(screenXsMax), 'matchesScreenXs')
@configure('searchInline')
export default class SearchToolbar extends Component {
	isFolderExist = (folders, name) => {
		const match = folders.filter(f => f.name.toLowerCase() === name.toLowerCase());
		return !!(match && match.length);
	};

	onSaveClick = () => {
		const {
			view,
			query,
			email,
			refetchFolders,
			notify: notifyAction,
			deleteFolder,
			allFolders,
			searchQuery
		} = this.props;
		const renameQuery = query
			.replace(/:/g, '-')
			.replace(/\//g, '.')
			.replace(/"/g, "'");
		const name = renameQuery || email;
		let match = this.isFolderExist(allFolders, name);
		let i = 1;
		let newName;
		while (match) {
			newName = name + i.toString();
			match = this.isFolderExist(allFolders, newName);
			i++;
		}
		// createSmartFolder
		this.props
			.createSearchFolder({
				name: newName || name,
				view,
				query: searchQuery || [query, email].filter(Boolean).join(' ')
			})
			.then(({ data: { createSearchFolder } }) => {
				const id = get(createSearchFolder, 'id');

				if (id) {
					notifyAction({
						message: <CreatedSmartFolder />,
						action: {
							label: <Text id="buttons.undo" />,
							fn: () => {
								deleteFolder(id).then(refetchFolders);
							}
						}
					});
					return refetchFolders();
				}
			})
			.catch(err => {
				const errCode = faultCode(err);
				console.error(errCode);
				this.props.showNotificationModal({
					message: err
				});
			});
	};

	onRefineClick = () => {
		this.props.setShowAdvanced({ show: true });
	};

	showRefineSearchButton = () => {
		const { searchType } = this.props;

		if (SEARCH_TYPE.mail === searchType) {
			return (
				<Button styleType="floating" brand="primary" onClick={this.onRefineClick}>
					<Text id="buttons.refineSearch" />
				</Button>
			);
		}
	};

	showSaveSearchButton = () => {
		const { searchType } = this.props;

		switch (searchType) {
			case SEARCH_TYPE.mail:
			case SEARCH_TYPE.contacts:
				return (
					<Button styleType="floating" brand="primary" onClick={this.onSaveClick}>
						<Text id="buttons.saveSearch" />
					</Button>
				);

			default:
				break;
		}
	};

	render({ items, more, limit, handleSetPane, matchesScreenMd, matchesScreenXs, searchInline }) {
		const resultCount = items ? (more ? limit : items.length) : 0;

		return (
			<div class={s.toolbar}>
				{matchesScreenMd && searchInline && (
					<Search class={s.tabSearchHeader} showDropDown searchScreen searchInline={searchInline} />
				)}

				<MailTypeTabs handleSetPane={handleSetPane} />
				{!matchesScreenXs && (
					<Text
						id="search.results"
						plural={resultCount}
						fields={{
							count: items && more ? resultCount + '+' : resultCount
						}}
					>
						No results
					</Text>
				)}

				{!matchesScreenXs && this.showSaveSearchButton()}
				{!matchesScreenXs && this.showRefineSearchButton()}
			</div>
		);
	}
}
