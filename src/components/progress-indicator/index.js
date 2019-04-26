import { h, Component } from 'preact';
import cx from 'classnames';
import wire from 'wiretie';
import style from './style';

@wire('zimbra', null, zimbra => ({ zimbra }))
@wire('zimbraBatchLink', null, zimbraBatchLink => ({ zimbraBatchLink }))
export default class ProgressIndicator extends Component {
	state = {
		totalRequests: 0,
		requests: 0,
		done: false
	};

	counter = 0;

	onRequest = () => {
		this.counter++;
		this.setState({
			done: false,
			requests: this.state.requests + 1,
			totalRequests: this.state.totalRequests + 1
		});
		if (!this.state.enabled && !this.timer) {
			this.timer = setTimeout(() => {
				this.timer = null;
				this.setState({ enabled: true });
			}, 450);
		}
	};

	onResponse = () => {
		const requests = Math.max(0, this.state.requests - 1);
		const id = ++this.counter;
		if (requests) {
			this.setState({ requests });
		} else {
			clearTimeout(this.timer);
			this.timer = null;
			this.setState(
				{
					requests,
					done: true,
					totalRequests: 0
				},
				() =>
					setTimeout(() => {
						if (id !== this.counter) return;
						this.setState({
							done: false,
							enabled: false
						});
					}, 150)
			);
		}
	};

	progressRef = c => {
		this.progressBar = c;
	};

	increment = () => {
		this.progressBar.style.transform = this.progressBar.style.transform.replace(
			/(\d+)/,
			(s, d) => parseFloat(d) + 1
		);
	};

	componentDidMount() {
		this.props.zimbra.on('req', this.onRequest);
		this.props.zimbra.on('res', this.onResponse);
		this.props.zimbraBatchLink.on('req', this.onRequest);
		this.props.zimbraBatchLink.on('res', this.onResponse);
	}

	componentDidUpdate(prevProps, prevState) {
		const enabled = this.state.requests && !this.state.done,
			wasEnabled = prevState.requests && !prevState.done;
		if (!enabled) {
			clearInterval(this.incrementTimer);
		} else if (!wasEnabled) {
			this.incrementTimer = setInterval(this.increment, 400);
		}
	}

	componentWillUnmount() {
		clearTimeout(this.timer);
		clearInterval(this.incrementTimer);
		this.props.zimbra.off('req', this.onRequest);
		this.props.zimbra.off('res', this.onResponse);
		if (this.props.link) {
			this.props.link.off('req', this.onRequest);
			this.props.link.off('res', this.onResponse);
		}
	}

	render({}, { requests, totalRequests, enabled, done }) {
		return (
			<div
				class={cx(style.progress, enabled && requests && style.enabled, done && style.done)}
				data-value={requests}
			>
				<div
					ref={this.progressRef}
					class={style.inner}
					style={{
						transform: `translateX(${
							done
								? 100
								: requests
								? ((1 + totalRequests - requests) / (1 + totalRequests)) * 100
								: 0
						}%)`
					}}
				/>
			</div>
		);
	}
}
