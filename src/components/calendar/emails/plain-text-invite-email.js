import inviteDate from './invite-date';

export default function plainTextInviteEmail({
	subject,
	organizer,
	start,
	end,
	location,
	attendees,
	body,
	template
}) {
	return `
${template.intro}

${template.subject} ${subject}
${template.organizer} "${organizer.name}" <${organizer.address}>

${template.time} ${inviteDate(start, end)}
${location.length ? template.location : ''} ${location}

${template.invitees} ${attendees.map(a => a.address).join('; ')}

*~*~*~*~*~*~*~*~*~*

${body}
`.trim();
}
