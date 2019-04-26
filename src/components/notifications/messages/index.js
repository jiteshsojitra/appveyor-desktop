import { h, Component } from 'preact';
import Markup from 'preact-markup';
import { Text, withText } from 'preact-i18n';

// TODO: Is this a block, or should it be merged upstream to `preact-i18n`?
@withText(props => ({ markup: <Text {...props} /> }))
class MarkupText extends Component {
	render({ markup }) {
		return <Markup markup={markup} trim={false} type="html" />;
	}
}

export const RenameMessage = ({ prevName, name }) => (
	<span>
		<MarkupText id={'toasts.renamed'} fields={{ prevName, name }} />
	</span>
);

// TODO: Dead code, use me somewhere
//export const DeletedMessage = ({ name }) => (
//	<span><b>{name}</b> deleted.</span>
//);

export const DeletedSmartFolder = ({ name }) => (
	<span>
		<Text id="search.save_search.delete" fields={{ name }} />
	</span>
);

export const CreatedMessage = ({ name }) => (
	<span>
		<MarkupText id={'toasts.created'} fields={{ name }} />
	</span>
);

export const CreatedSmartFolder = () => (
	<span>
		<Text id="search.save_search.success" />
	</span>
);

export const UpdatedSmartFolderQuery = () => (
	<span>
		<Text id="search.save_search.updated" />
	</span>
);

export const MovedMessage = ({ name, destName }) => (
	<span>
		<MarkupText id={'toasts.movedTo'} fields={{ name, destName }} />
	</span>
);

export const MovedTopLevelMessage = ({ name }) => (
	<span>
		<MarkupText id={'toasts.movedToTopLevel'} fields={{ name }} />
	</span>
);

export const MovedSmartFolderMessage = ({ name }) => (
	<span>{<MarkupText id="notifications.savedSearchesMoved" fields={{ name }} />}</span>
);

export const OnlyEmptyFoldersDeletedMessage = ({ name }) => (
	<span>
		<MarkupText id={'toasts.emptyFolderDeleteMsg'} fields={{ name }} />
	</span>
);

export const FolderAlreadyExistsMessage = ({ view, name }) => (
	<span>
		<MarkupText id={`toasts.folderExists.${view}`} fields={{ name }} />
	</span>
);
