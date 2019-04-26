export default function toSentence(
	arr,
	{
		wordsConnector = ', ',
		twoWordsConnector = ' and ',
		lastWordConnector = ', and ',
		expandedLimit = -1,
		expandedItemsConnector = ' others'
	} = {}
) {
	switch (arr.length) {
		case 0:
			return '';
		case 1:
			return arr[0] + '';
		case 2:
			return `${arr[0]}${twoWordsConnector}${arr[1]}`;
		default:
			return `${arr.slice(0, expandedLimit).join(wordsConnector)}${lastWordConnector}${expanded(
				arr,
				expandedLimit,
				expandedItemsConnector
			)}`;
	}
}

function expanded(arr, limit, connector) {
	if (limit === -1) {
		return arr.slice(-1);
	}
	return `${arr.length - limit}${connector}`;
}
