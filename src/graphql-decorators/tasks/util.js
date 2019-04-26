import format from 'date-fns/format';
import get from 'lodash-es/get';
import { NORMAL_PRIORITY } from '../../constants/tasks';

export function createTaskMutationVariables({
	inviteId,
	modifiedSequence,
	revision,
	userDisplayName,
	primaryAddress,
	name,
	folderId,
	dueDate,
	instances,
	priority = NORMAL_PRIORITY,
	notes,
	status,
	percentComplete
}) {
	const organizer = {
		address: primaryAddress,
		name: userDisplayName
	};

	dueDate = dueDate || get(instances, '[0].dueDate');
	const end = !dueDate
		? {}
		: {
				allDay: true, // Tasks should always be all day
				end: {
					date: format(dueDate, 'YYYYMMDD')
				}
		  };

	//fields only set when modifying a task
	const modifyFields = !inviteId
		? {}
		: {
				id: inviteId,
				modifiedSequence,
				revision
		  };

	const description = !notes
		? {}
		: {
				mimeParts: {
					contentType: 'multipart/alternative',
					mimeParts: [
						{
							contentType: 'text/plain',
							content: notes
						},
						{
							contentType: 'text/html',
							content: '<html><body>' + notes.replace('\n', '<br />') + '</body></html>'
						}
					]
				}
		  };

	return {
		task: {
			...modifyFields,
			message: {
				folderId,
				subject: name,
				invitations: {
					components: [
						{
							name,
							priority,
							percentComplete,
							status,
							organizer,
							...end,
							class: 'PUB',
							noBlob: true //this tell it to use description for notes instead of full mime parts
						}
					]
				},
				...description,
				emailAddresses: [
					{
						address: primaryAddress,
						name: userDisplayName,
						type: 'f'
					}
				]
			}
		}
	};
}

// Function will be mutating data object
export function optimisticTaskMove(data, inviteId, destFolderId) {
	// First remove task entry from original folder
	let origTask;
	const origFolder = data.taskFolders.find(
		fld => fld.tasks.tasks.find(t => t.inviteId === inviteId) !== undefined
	);
	if (origFolder) {
		origFolder.tasks.tasks = origFolder.tasks.tasks.filter(
			t => t.inviteId !== inviteId || ((origTask = t) && false)
		);
	}

	// @FIXME this is bad, we should be getting fld.id in ID format not String
	destFolderId = String(destFolderId);

	// Now add task entry to destination folder
	const destFolder = data.taskFolders.find(fld => destFolderId === fld.id);
	if (destFolder && origTask) {
		origTask.folderId = destFolderId;
		destFolder.tasks.tasks.push(origTask);
	}
}
