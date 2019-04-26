import { getSearchContactVariables } from '../../graphql/utils/graphql-optimistic';
import SearchQuery from '../../graphql/queries/search/search.graphql';
import { mergeSearches } from '../search';
import GetFolder from '../../graphql/queries/folders/get-folder.graphql';
import { USER_FOLDER_IDS } from '../../constants';
import { CONTACTS, EMAILED_CONTACTS } from '../../constants/folders';
import { CONTACTS_VIEW } from '../../constants/views';

function getContactFolders(client) {
	return client.query({
		query: GetFolder,
		variables: {
			view: CONTACTS_VIEW
		}
	});
}

function folderIdToUpdate(folderName) {
	switch (folderName) {
		case CONTACTS:
			return USER_FOLDER_IDS.CONTACTS.toString();
		case EMAILED_CONTACTS:
			return USER_FOLDER_IDS.EMAILED_CONTACTS.toString();
	}
}

function getContactsInFolder(client, { folderName = 'Contacts' }) {
	return client.query({
		query: SearchQuery,
		variables: {
			...getSearchContactVariables(client, folderName, 'NOT #type:group'),
			types: 'contact',
			needExp: true,
			limit: 1000,
			sortBy: 'nameAsc',
			memberOf: true,
			query: `in:"${folderName}" NOT #type:group`
		}
	});
}

export function primeContactsCache(context, { folderName }) {
	const { client } = context;
	return getContactFolders(client).then(
		getContactsInFolder(client, { folderName }).then(({ data }) => {
			// Contacts vertical search queries
			const contactVariables = getSearchContactVariables(client, folderName, 'NOT #type:group');
			if (contactVariables) {
				const contactsData = client.readQuery({
					query: SearchQuery,
					variables: contactVariables
				});

				client.writeQuery({
					query: SearchQuery,
					variables: {
						...contactVariables,
						types: 'contact',
						needExp: true,
						limit: 1000,
						sortBy: 'nameAsc',
						memberOf: true,
						query: `in:"${folderName}" NOT #type:group`
					},
					data: {
						search: mergeSearches(contactsData, data)
					}
				});
			}

			// Contact Picker: Contacts and Emailed Contacts
			const idToUpdate = folderIdToUpdate(folderName);
			const pickerVariables = getSearchContactVariables(client, idToUpdate, 'NOT #type:group');
			let pickerData;
			if (pickerVariables) {
				pickerData = client.readQuery({
					query: SearchQuery,
					variables: pickerVariables
				});
			}
			client.writeQuery({
				query: SearchQuery,
				variables: {
					...pickerVariables,
					types: 'contact',
					needExp: true,
					limit: 1000,
					sortBy: 'nameAsc',
					query: `inid:"${idToUpdate}" NOT #type:group`
				},
				data: {
					search: pickerData ? mergeSearches(pickerData, data) : data.search
				}
			});

			// Contact Picker: All Contacts
			const allContactsVariables = getSearchContactVariables(client, null, 'NOT #type:group');
			let allContactsData;
			if (allContactsVariables) {
				allContactsData = client.readQuery({
					query: SearchQuery,
					variables: {
						...allContactsVariables,
						query: `NOT #type:group`
					}
				});
			}

			client.writeQuery({
				query: SearchQuery,
				variables: {
					...allContactsVariables,
					types: 'contact',
					needExp: true,
					limit: 1000,
					sortBy: 'nameAsc',
					query: `NOT #type:group`
				},
				data: {
					search: allContactsData ? mergeSearches(allContactsData, data) : data.search
				}
			});
		})
	);
}
