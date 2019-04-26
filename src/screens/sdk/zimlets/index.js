/* eslint-disable preact-i18n/no-text-as-children */

import { h, Component } from 'preact';
import linkState from 'linkstate';
import TextInput from '../../../components/text-input';
import ZimletLoader from '../../../components/zimlet-loader';
import { Button } from '@zimbra/blocks';
import zimletLocalStorage from '../../../utils/zimlet-storage';
import { callWith } from '../../../lib/util';
import style from './style';

export default class ZimletsSdk extends Component {
	handleLoadZimlets = ({ running: runningZimlets, errors }) => {
		this.setState({ runningZimlets, errors });
	};

	togglePersist = ({ name, persist }) => {
		const { persistedZimlets, zimlets, errors = {} } = this.state;
		if (persist) {
			persistedZimlets[name] = zimlets[name];
		} else {
			delete persistedZimlets[name];
		}
		//remove errored zimlets from the list of zimlets if they choose not to persist
		if (errors[name] && !persist) {
			delete zimlets[name];
		}
		this.setState({ persistedZimlets: { ...persistedZimlets }, zimlets: { ...zimlets } });
		zimletLocalStorage.set(persistedZimlets);
	};

	addZimlet = () => {
		let { zimlets, persistedZimlets, name, url } = this.state;

		console.log(`Adding Zimlet ${name}: ${url}`); // eslint-disable-line no-console

		if (zimlets[name]) {
			return this.setState({ error: 'Zimlet with that name is already loaded' });
		}

		persistedZimlets = { ...persistedZimlets, [name]: { url } };
		zimlets = { ...zimlets, [name]: { url } };

		this.setState({
			name: '',
			url: '',
			zimlets,
			persistedZimlets
		});

		zimletLocalStorage.set(persistedZimlets);
	};

	constructor(props, context) {
		super(props, context);
		const persistedZimlets = zimletLocalStorage.get() || {};
		this.state = {
			url: 'https://localhost:8081/index.js',
			persistedZimlets,
			runningZimlets: {},
			zimlets: persistedZimlets
		};
	}

	render(props, { url, name, zimlets, persistedZimlets, runningZimlets, errors = {} }) {
		return (
			<div class={style.root}>
				<ZimletLoader zimlets={zimlets} onLoadZimlets={this.handleLoadZimlets} />
				<header>
					<h2>Zimlets SDK</h2>
				</header>
				<div class={style.main}>
					<div class={style.description}>
						Use this page to load a remote zimlet javascript bundle for testing.
					</div>
					<form onSubmit={this.addZimlet} action="javascript:">
						<TextInput value={name} onInput={linkState(this, 'name')} placeholder="Zimlet Name" />
						<TextInput type="url" value={url} onInput={linkState(this, 'url')} />
						<Button type="submit">Load Zimlet</Button>
					</form>

					<table>
						<caption>Zimlets Loaded By SDK</caption>
						<thead>
							<tr>
								<th>Name</th>
								<th>URL</th>
								<th>Status</th>
								<th>Persist on Reload</th>
							</tr>
						</thead>

						<tbody>
							{Object.keys(zimlets).map(zimletName => (
								<ZimletRow
									name={zimletName}
									url={zimlets[zimletName].url}
									error={errors[zimletName]}
									running={runningZimlets[zimletName]}
									onChangePersist={this.togglePersist}
									persisted={!!persistedZimlets[zimletName]}
								/>
							))}
						</tbody>
					</table>

					<div class={style.showZimlets}>
						<a href="?zimletSlots=show">Click here</a> to show available zimlet slots
					</div>
				</div>
			</div>
		);
	}
}

/**
 * A single row in the table of zimlets loaded by the SDK
 */
function ZimletRow({ name, url, error, running, persisted, onChangePersist }) {
	return (
		<tr>
			<td class={style.name}>{name}</td>
			<td>
				<a href={url} target="_blank" rel="noopener noreferrer">
					{url}
				</a>
			</td>
			<td class={error ? style.statusError : running ? style.statusRunning : style.statusLoading}>
				{error ? `Error: ${error}` : running ? 'Running' : 'Loading'}
			</td>
			<td class={style.persist}>
				<input
					type="checkbox"
					onChange={callWith(onChangePersist, { name, persist: !persisted })}
					checked={persisted}
				/>
			</td>
		</tr>
	);
}
