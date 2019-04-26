import { h, Component } from 'preact';
import Router from 'preact-router';
import { Text } from 'preact-i18n';
import { configure } from '../config';
import { connect } from 'preact-redux';
import { getParsedSearch } from '../store/url/selectors';
import ZimletSlot from '../components/zimlet-slot';
import split from '../lib/split-point';
import { message, conversation } from '../constants/types';

const ErrorPage = () => (
	<div>
		<h2>
			<Text id="routes.notFound" />
		</h2>
		<a href="/">
			<Text id="routes.home" />
		</a>
	</div>
);

const Routes = {
	bitmojiAuth: split(
		import(/* webpackMode: "lazy", webpackChunkName: "bitmojiAuth" */ '../components/bitmoji-auth')
	),
	mail: split(import(/* webpackMode: "lazy", webpackChunkName: "mail-screen" */ '../screens/mail')),
	contacts: split(
		import(/* webpackMode: "lazy", webpackChunkName: "contacts-screen" */ '../components/contacts')
	),
	calendar: split(
		import(/* webpackMode: "lazy", webpackChunkName: "calendar-screen" */ '../components/calendar')
	),
	search: {
		mail: split(
			import(
				/* webpackMode: "lazy", webpackChunkName: "search-mail-screen" */ '../screens/search/mail'
			)
		),
		calendar: split(
			import(
				/* webpackMode: "lazy", webpackChunkName: "search-calendar-screen" */ '../screens/search/calendar'
			)
		),
		contacts: split(
			import(
				/* webpackMode: "lazy", webpackChunkName: "search-contacts-screen" */ '../screens/search/contacts'
			)
		)
	},
	dev: split(
		import(/* webpackMode: "lazy", webpackChunkName: "blocks-demo" */ '@zimbra/blocks/src/dev')
	),
	zimletsSdk: split(
		import(/* webpackMode: "lazy", webpackChunkName: "zimlets-sdk" */ '../screens/sdk/zimlets')
	),
	graphiql: split(
		import(/* webpackMode: "lazy", webpackChunkName: "graphiql" */ '../screens/graphiql')
	),
	error: ErrorPage,
	print: split(
		import(/* webpackMode: "lazy", webpackChunkName: "print-screen" */ '../components/print')
	)
};

@configure('routes.slugs')
@connect(state => ({
	// Use query parameters as parameters for new Compose window
	search: getParsedSearch(state)
}))
export default class AppRouter extends Component {
	render({ slugs, search, ...props }) {
		return (
			<ZimletSlot name="routes" slugs={slugs}>
				{slotContent => (
					<Router {...props}>
						<Routes.mail path={`/`} />
						<Routes.bitmojiAuth path={`/bitmojiAuth`} />
						<Routes.print path={`/print/:printcommand`} />
						<Routes.mail path={`/${slugs.email}/${slugs.localFolder}/:folderName`} localFolder />
						<Routes.mail
							path={`/${slugs.email}/${slugs.localFolder}/:folderName/${slugs.message}/:id`}
							type={message}
							localFolder
						/>
						<Routes.mail
							path={`/${slugs.message}/${slugs.localFolder}/:id`}
							replyLocalFolder
							type={message}
							disableList
							disableMessageNavigation
						/>
						<Routes.mail
							path={`/${slugs.conversation}/:id`}
							type={conversation}
							disableList
							disableMessageNavigation
						/>
						<Routes.mail
							path={`/${slugs.message}/:id`}
							type={message}
							disableList
							disableMessageNavigation
						/>
						<Routes.mail path={`/${slugs.email}/new`} compose={{ message: search }} />
						<Routes.mail path={`/${slugs.email}/:folderName`} />
						<Routes.mail path={`/${slugs.email}/:folderName/:type/:id`} />
						<Routes.mail path={`/${slugs.email}/:folderName/:type/:id/print`} hideHeader />
						<Routes.calendar path={`/${slugs.calendar}`} />
						<Routes.calendar path={`/${slugs.calendar}/event/new`} createEvent />
						<Routes.calendar path={`/${slugs.calendar}/event/:actionType/:id`} />
						{/*:actionType is used to differentiate between edit and forward event*/}
						<Routes.calendar path={`/${slugs.calendar}/event/:actionType/:id/:type`} />
						{/*:type is used for single or all occurrence of recurrring event*/}
						<Routes.contacts path={`/${slugs.contacts}`} />
						<Routes.contacts path={`/${slugs.contacts}/new`} contact="new" />
						<Routes.contacts path={`/${slugs.contacts}/:folder`} />
						<Routes.contacts path={`/${slugs.contacts}/:folder/:contact`} />
						<Routes.search.mail path={`/search/${slugs.email}`} />
						<Routes.search.calendar path={`/search/${slugs.calendar}`} />
						<Routes.search.contacts path={`/search/${slugs.contacts}`} />
						<Routes.zimletsSdk path="/sdk/zimlets" />
						<Routes.dev path={`/dev/:block?`} />
						<Routes.graphiql path="/graphiql" />
						{slotContent}
						<Routes.error default />
					</Router>
				)}
			</ZimletSlot>
		);
	}
}
