import { h } from 'preact';
import style from './style';

/**
 * This component loads a print preview into the Zimbra X UI
 * based off the url & specified search parameters.
 * It is intented to be used via the /print route.
 *
 * This componenet allows us to do a login check prior to contacting
 * the legacy Zimbra proxy, so that the url is not modified by the proxy
 * when in an un-authenticated state
 */
const Print = () => {
	//change /print/ in url to /h/ so this works with proxy/legacy zimbra
	const pathname = location.pathname.replace('/print/', '/h/');
	return (
		<iframe id="iframe" src={`/@zimbra${pathname}${location.search}`} class={style.printFrame} />
	);
};

export default Print;
