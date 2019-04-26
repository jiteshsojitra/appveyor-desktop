/* eslint preact-i18n/no-text-as-attribute: [off] */

import { h, Component } from 'preact';
import { parse } from 'graphql';
import GraphiQL from 'graphiql';
import { execute } from 'apollo-link';

import 'graphiql/graphiql.css';
import './style.less';

export default class GraphiQLScreen extends Component {
	state = {
		show: false
	};

	// https://www.apollographql.com/docs/link/#graphiql
	fetcher = operation => {
		operation.query = parse(operation.query);
		return execute(this.context.zimbraBatchLink, operation);
	};

	componentDidMount() {
		// Ensure the CSS loads first because of codemirror
		setTimeout(() => {
			this.setState({ show: true });
		}, 2000);
	}

	render(props, { show }) {
		return (
			show && (
				<div
					style={{
						position: 'fixed',
						top: '0',
						right: '0',
						bottom: '0',
						left: '0',
						backgroundColor: 'white'
					}}
				>
					<GraphiQL title="Zimbra GraphQL" fetcher={this.fetcher} schema={this.context.schema} />
				</div>
			)
		);
	}
}
