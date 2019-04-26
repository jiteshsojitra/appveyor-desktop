import { h } from 'preact';
import { MarkupText } from 'preact-i18n';

import { FILTER_ACTION_TYPE } from '../../../constants/filter-rules';

export default function FilterRuleAction({ action }) {
	const folderPath = action[FILTER_ACTION_TYPE.FILE_INTO][0].folderPath;
	return <MarkupText id="settings.filterRuleModal.deliverTo" fields={{ folderPath }} />;
}
