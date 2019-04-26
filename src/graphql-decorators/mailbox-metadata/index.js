import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import get from 'lodash/get';

import { normalizeFoldersExpanded } from '../../utils/prefs';
import {
	getMailboxMetadata as getMailboxMetadataQuery,
	setMailboxMetadata as setMailboxMetadataQuery
} from '../../graphql/queries/mailbox-metadata.graphql';
import {
	ARCHIVE_MAILBOX_METADATA_SECTION,
	DEFAULT_MAILBOX_METADATA_SECTION,
	MailListPaneMaxGrowthThreshold,
	MailListPaneMinShrinkThreshold
} from '../../constants/mailbox-metadata';

export function getMailboxMetadata(section) {
	return graphql(getMailboxMetadataQuery, {
		options: { variables: { ...(section && { section }) } },
		props: ({ data: { getMailboxMetadata: mailboxMetadata } }) => {
			const attrs = get(mailboxMetadata, 'meta.0._attrs') || {};

			let { zimbraPrefReadingPaneSashHorizontal, zimbraPrefReadingPaneSashVertical } = attrs;

			if (zimbraPrefReadingPaneSashHorizontal) {
				zimbraPrefReadingPaneSashHorizontal = Math.min(
					Math.max(zimbraPrefReadingPaneSashHorizontal, MailListPaneMinShrinkThreshold),
					MailListPaneMaxGrowthThreshold
				);
			}

			if (zimbraPrefReadingPaneSashVertical) {
				zimbraPrefReadingPaneSashVertical = Math.min(
					Math.max(zimbraPrefReadingPaneSashVertical, MailListPaneMinShrinkThreshold),
					MailListPaneMaxGrowthThreshold
				);
			}

			return {
				mailboxMetadata: {
					...attrs,
					zimbraPrefReadingPaneSashHorizontal,
					zimbraPrefReadingPaneSashVertical
				},
				folderTreeOpen: get(attrs, 'zimbraPrefCustomFolderTreeOpen'),
				smartFolderTreeOpen: get(attrs, 'zimbraPrefSmartFolderTreeOpen'),
				foldersExpanded: normalizeFoldersExpanded(get(attrs, 'zimbraPrefFoldersExpanded')),
				groupByList: get(attrs, 'zimbraPrefGroupByList'),
				messageListDensity: get(attrs, 'zimbraPrefMessageListDensity')
			};
		}
	});
}

export function getArchiveZimletMailboxMetadata() {
	return graphql(getMailboxMetadataQuery, {
		options: { variables: { section: ARCHIVE_MAILBOX_METADATA_SECTION } },
		props: ({ data: { getMailboxMetadata: mailboxMetadata } }) => {
			const attrs = get(mailboxMetadata, 'meta.0._attrs');
			return {
				archivedFolder: get(attrs, 'archivedFolder')
			};
		}
	});
}

const mailboxMetadataMutationFactory = (propName, section) => () =>
	graphql(setMailboxMetadataQuery, {
		props: ({
			ownProps: {
				mailboxMetadata: { __typename: _, ...mailboxMetadata }
			},
			mutate
		}) => ({
			[propName]: attrs => {
				// All attributes must be passed to the server when modifying
				const nextAttrs = {
					...mailboxMetadata,
					...attrs
				};

				return mutate({
					variables: {
						section,
						attrs: nextAttrs
					},
					optimisticResponse: {
						__typename: 'Mutation',
						[propName]: true
					},
					update: proxy => {
						// Write a fragment to the subsection of MailboxMetadata
						// with the changed attributes.
						proxy.writeFragment({
							id: `$MailboxMetadata:${section}.meta.0._attrs`,
							fragment: gql`
								fragment attrs on MailboxMetadataAttrs {
									${Object.keys(nextAttrs)}
								}
							`,
							data: {
								__typename: 'MailboxMetadataAttrs',
								...nextAttrs
							}
						});
					}
				});
			}
		})
	});

export const withSetMailboxMetaData = mailboxMetadataMutationFactory(
	'setMailboxMetadata',
	DEFAULT_MAILBOX_METADATA_SECTION
);
export const withSetArchiveMailboxMetaData = mailboxMetadataMutationFactory(
	'setArchiveZimletMailboxMetadata',
	ARCHIVE_MAILBOX_METADATA_SECTION
);
