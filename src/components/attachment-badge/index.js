import { h } from 'preact';
import cx from 'classnames';
import { Icon, Card, Spinner } from '@zimbra/blocks';
import style from './style';
import mime from 'mime-types';

const EXTENSION_REGEX = /[^\\.]+$/;

const INCONCLUSIVE_MIME_TYPES = ['bin'];

const PDF = {
	icon: 'file-pdf-o',
	className: 'pdf'
};

const XLS = {
	icon: 'file-excel-o',
	className: 'xls'
};

const ZIP = {
	icon: 'file-archive-o',
	className: 'zip'
};

const DOC = {
	icon: 'file-word-o',
	className: 'doc'
};

const PPT = {
	icon: 'file-powerpoint-o',
	className: 'ppt'
};

const MOV = {
	icon: 'play-circle-o',
	className: 'media'
};

const MUS = {
	icon: 'music',
	className: 'media'
};

const IMG = {
	icon: 'image',
	className: 'media'
};

const VCF = {
	icon: 'user',
	className: 'default'
};

const EML = {
	icon: 'envelope',
	className: 'default'
};

const COD = {
	icon: 'code',
	className: 'code'
};

const WEB = {
	icon: 'web',
	className: 'code'
};

const DEFAULT = {
	icon: 'paperclip',
	className: 'default'
};

const supportedMimes = {
	txt: DOC,
	doc: DOC,
	docx: DOC,
	odt: DOC,
	rtf: DOC,
	wps: DOC,
	wpd: DOC,
	ppt: PPT,
	pptx: PPT,
	odp: PPT,
	pps: PPT,
	pot: PPT,
	pptm: PPT,
	potx: PPT,
	potm: PPT,
	xls: XLS,
	xlsx: XLS,
	ods: XLS,
	csv: XLS,
	tsv: XLS,
	xlsm: XLS,
	xltx: XLS,
	xltm: XLS,
	pdf: PDF,
	ps: PDF,
	eps: PDF,
	prn: PDF,
	xps: PDF,
	ai: PDF,
	svg: IMG,
	icns: IMG,
	tiff: IMG,
	tif: IMG,
	jpf: IMG,
	jp2: IMG,
	j2k: IMG,
	j2c: IMG,
	jpc: IMG,
	jpm: IMG,
	mj2: IMG,
	rar: ZIP,
	zip: ZIP,
	tar: ZIP,
	gz: ZIP,
	'7z': ZIP,
	mov: MOV,
	mp4: MOV,
	qt: MOV,
	wmv: MOV,
	swf: MOV,
	'3gp': MOV,
	'3g2': MOV,
	mpga: MUS,
	mp3: MUS,
	aif: MUS,
	aiff: MUS,
	wav: MUS,
	wma: MUS,
	eml: EML,
	htm: WEB,
	html: WEB,
	js: COD,
	css: COD,
	xml: COD,
	vcf: VCF
};

const supportedImageMimes = ['jpeg', 'jpg', 'jpe', 'png', 'gif', 'ico', 'bmp'];

const ContentTypeIcon = ({ iconName, ...props }) => (
	<Icon {...props} class={cx(style.contentTypeIcon, props.class)} name={iconName} />
);

const IconAttachment = ({ mimeType, isUploading, ...props }) => {
	const supportedMime = supportedMimes[mimeType] || DEFAULT;
	return (
		<Card
			{...props}
			scrim={false}
			class={cx(
				isUploading ? style.uploading : style[supportedMime.className] || style.default,
				style.iconWrapper
			)}
		>
			<div>
				{isUploading ? <Spinner block /> : <ContentTypeIcon iconName={supportedMime.icon} />}
			</div>
		</Card>
	);
};

class ImageAttachment {
	render({ attachment, isUploading, isLocalFilePath, ...rest }) {
		const { contentType, type, url, base64 } = attachment;
		const image = base64
			? `data:${contentType || type};base64,${base64}`
			: isLocalFilePath
			? url
			: this.context.zimbraBatchClient.getAttachmentUrl(attachment);
		return (
			<Card
				{...rest}
				scrim={false}
				class={cx(isUploading && style.uploading, style.iconWrapper)}
				style={
					!isUploading && {
						...(image && { backgroundImage: `url(${image})` }),
						backgroundPosition: 'center',
						backgroundSize: 'cover',
						backgroundRepeat: 'no-repeat'
					}
				}
			>
				{isUploading && (
					<div>
						<Spinner block />
					</div>
				)}
			</Card>
		);
	}
}

function conclusiveMimeType(mimeExtType) {
	return INCONCLUSIVE_MIME_TYPES.indexOf(mimeExtType) === -1 ? mimeExtType : false;
}

const AttachmentBadge = ({ attachment, ...rest }) => {
	const type = attachment.contentType || attachment.type;
	const mimeType =
		conclusiveMimeType(mime.extension(type)) ||
		EXTENSION_REGEX.exec(attachment.filename || attachment.name)[0];

	return supportedImageMimes.indexOf(mimeType) > -1 ? (
		<ImageAttachment attachment={attachment} {...rest} />
	) : (
		<IconAttachment mimeType={mimeType} {...rest} />
	);
};
export default AttachmentBadge;
