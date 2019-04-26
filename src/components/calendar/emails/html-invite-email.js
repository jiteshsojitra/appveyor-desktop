import h from 'vhtml';
import inviteDate from './invite-date';

const htmlInviteEmail = ({
	subject,
	organizer,
	start,
	end,
	location,
	attendees,
	body,
	template
}) => (
	<html lang={template.lang.iso} dir={template.lang.dir}>
		<body id="htmlmode">
			<h3>{template.intro}</h3>
			<div>
				<table border="0">
					<tr>
						<th align="left">{template.subject}</th>
						<td>{subject}</td>
					</tr>
					<tr>
						<th align="left">{template.organizer}</th>
						<td>
							"{organizer.name}" &lt;{organizer.address}&gt;
						</td>
					</tr>
				</table>
				<table border="0">
					<tr>
						<th align="left">{template.time}</th>
						<td>{inviteDate(start, end)}</td>
					</tr>
				</table>
				<table border="0">
					<tr>
						<th align="left">{location.length ? template.location : ''}</th>
						<td>{location}</td>
					</tr>
				</table>
				<table border="0">
					<tr>
						<th align="left">{template.invitees}</th>
						<td>{attendees.map(a => a.address).join('; ')}</td>
					</tr>
				</table>
				<br />
				<div>
					<div style="white-space: pre-wrap;">{body}</div>
				</div>
			</div>
		</body>
	</html>
);

export default htmlInviteEmail;
