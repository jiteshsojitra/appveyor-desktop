import { createTaskMutationVariables, optimisticTaskMove } from './util';
import format from 'date-fns/format';
import withAccountInfo from '../../graphql-decorators/account-info';
import { getPrimaryAccountName, getPrimaryAccountAddress } from '../../utils/account';
import { TaskQuery, FoldersQuery, TaskModifyMutation } from '../../graphql/queries/tasks.graphql';
import get from 'lodash-es/get';
import { graphql, compose, withApollo } from 'react-apollo';
import { withTrashFolder } from './folder-actions';

export default function withModifyTask() {
	return compose(
		withTrashFolder(),
		withApollo, //needed so we can make direct queries in TaskModifyMutation
		withAccountInfo(({ data: { accountInfo } }) => ({
			userDisplayName: accountInfo && getPrimaryAccountName(accountInfo),
			primaryAddress: accountInfo && getPrimaryAccountAddress(accountInfo)
		})),
		graphql(TaskModifyMutation, {
			props: ({ ownProps: { client, userDisplayName, primaryAddress }, mutate }) => ({
				modifyTask: modifyTaskInput =>
					// to avoid accidentally losing data, always merge in the modifyTaskInput with the necessary full task details
					// This is typically fast because in most edit scenarios the task is already cached
					client
						.query({
							query: TaskQuery,
							variables: {
								id: modifyTaskInput.inviteId
							}
						})
						.then(({ data: { task: fullTask } }) => {
							if (typeof modifyTaskInput.notes === 'undefined') {
								modifyTaskInput.notes = get(
									fullTask,
									'invitations.0.components.0.description.0._content'
								);
							}

							const mutationVariables = createTaskMutationVariables({
								userDisplayName,
								primaryAddress,
								...modifyTaskInput
							});

							return mutate({
								variables: mutationVariables,
								optimisticResponse: {
									modifyTask: {}
								},
								update: cache => {
									const data = cache.readQuery({ query: FoldersQuery });
									let task = data.taskFolders.reduce(
										(acc, folder) =>
											acc ||
											folder.tasks.tasks.find(
												({ inviteId }) => inviteId === mutationVariables.task.id
											),
										undefined
									);

									if (task) {
										task = Object.assign(task, {
											instances: [
												{
													dueDate:
														(get(
															mutationVariables,
															'task.message.invitations.components[0].end.date'
														) &&
															parseInt(
																format(
																	get(
																		mutationVariables,
																		'task.message.invitations.components[0].end.date'
																	),
																	'x'
																),
																10
															)) ||
														'',
													tzoDue: '',
													__typename: 'Instance'
												}
											],
											...mutationVariables.task.message.invitations.components[0],
											percentComplete: get(
												mutationVariables,
												'task.message.invitations.components[0].percentComplete',
												''
											),
											// Don't change folder id now, as it requires extra processing
											folderId: task.folderId
										});

										// Check if we are moving task from one folder to another
										if (task.folderId !== mutationVariables.task.message.folderId) {
											optimisticTaskMove(
												data,
												mutationVariables.task.id,
												mutationVariables.task.message.folderId
											);
										}
									}

									cache.writeQuery({ query: FoldersQuery, data });
								},
								refetchQueries: [
									{
										query: FoldersQuery
									},
									{
										query: TaskQuery,
										variables: { id: mutationVariables.task.id }
									}
								]
							});
						})
			})
		})
	);
}
