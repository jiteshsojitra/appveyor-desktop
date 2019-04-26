import {
	LICENSE_GOOD,
	LICENSE_GRACE,
	LICENSE_ACTIV_GRACE,
	LICENSE_SMIME
} from '../constants/license';
import get from 'lodash/get';

// Check if licese is active for zimbra server
export const isLicenseActive = license => {
	if (!license) return false;

	return [LICENSE_GOOD, LICENSE_GRACE, LICENSE_ACTIV_GRACE].indexOf(license.status) !== -1;
};

// Check if SMIME flag is present in license block
export const hasSMIMEFeature = license => {
	if (!isLicenseActive(license)) return false;

	const licenseAttr = get(license, 'attr');
	const smimeFlag =
		licenseAttr.length &&
		licenseAttr.find(licenseFlag => licenseFlag && licenseFlag.name === LICENSE_SMIME);

	return (smimeFlag && smimeFlag._content) || false;
};

// SMIME should be available only in mac/windows zimbra desktop build
export const isSMIMEFeatureAvailable = license => {
	if (process.env.ELECTRON_ENV && (process.platform === 'win32' || process.platform === 'darwin')) {
		return hasSMIMEFeature(license);
	}

	return false;
};
