import { graphql } from 'react-apollo';
import UploadMessageMutation from './../../graphql/queries/upload-message-mutation.graphql';

export function withUploadMessage() {
	return graphql(UploadMessageMutation, {
		props: ({ mutate }) => ({
			uploadMessage: value =>
				mutate({
					variables: {
						value
					}
				})
		})
	});
}
