# Automatically install private certificates in Windows OS
Get-Command -Module PKIClient;

$password = 'test123';
#$securePassword = ConvertTo-SecureString -String $password -AsPlainText -Force;
#$certificateLocation = 'Cert:\CurrentUser\My';
#Import-PfxCertificate -FilePath $username -Password $securePassword -CertStoreLocation $certificateLocation;

# Install certificates
if ($env:APPVEYOR_DEBUG -eq 'TRUE') {
	certutil -addstore "Root" cacert.crt;
} else {
	certutil -addstore "Root" cacert.crt > $null 2>&1;
}
function Install-Certificate {
	Param ([string]$username);
	if ($env:APPVEYOR_DEBUG -eq 'TRUE') {
		certutil -f -p $password -enterprise -importpfx $username "";
		certutil -p $password -user -importpfx $username NoRoot;
	} else {
		certutil -f -p $password -enterprise -importpfx $username "" > $null 2>&1;
		certutil -p $password -user -importpfx $username NoRoot > $null 2>&1;
	}
}

# Smoke
$smokeUsers = 'smokeuser';
for ($i = 1; $i -le 5; $i += 1) {
	$username = $smokeUsers + $i + '.p12';
	Install-Certificate $username;
}

# BHR
$bhrUsers = 'bhruser';
for ($i = 6; $i -le 10; $i += 1) {
	$username = $bhrUsers + $i + '.p12';
	Install-Certificate $username;
}

# Functional
$functionalUsers = 'functionaluser';
for ($i = 11; $i -le 15; $i += 1) {
	$username = $functionalUsers + $i + '.p12';
	Install-Certificate $username;
}

# Full
$fullUsers = 'fulluser';
for ($i = 16; $i -le 20; $i += 1) {
	$username = $fullUsers + $i + '.p12';
	Install-Certificate $username;
}