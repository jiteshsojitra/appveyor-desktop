import { h, Component } from 'preact';
import style from './style';

export default class LazyLoadedImage extends Component {
	state = { isLoaded: false };

	resetImage = () => {
		this.setState({ isLoaded: false }, () => this.waitToLoad(500));
	};

	waitToLoad = time => setTimeout(() => this.setState({ isLoaded: true }), time);

	componentDidMount() {
		this.waitToLoad(this.props.imageIndex * 200);
	}

	render = ({ imageIndex, url }, { isLoaded }) => {
		const id = `attachImage${imageIndex}`;
		return <img src={isLoaded ? url : ''} id={id} class={style.image} onError={this.resetImage} />;
	};
}
