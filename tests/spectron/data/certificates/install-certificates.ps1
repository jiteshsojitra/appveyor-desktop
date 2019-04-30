# Automatically install private certificates in Windows OS
Get-Command -Module PKIClient;

$plainPassword = 'test123';
#$securePassword = ConvertTo-SecureString -String $plainPassword -AsPlainText -Force;
#$certificateLocation = 'Cert:\CurrentUser\My';

# Install certificates
function Install-Certificate {
	Param ([string]$username);
		if ($env:DEBUG -eq 'TRUE') {
			Write-Host Installing private certificate of $username;
		}
		certutil -f -p $plainPassword -enterprise -importpfx $username "";
		certutil -p $plainPassword -user -importpfx $username NoRoot
		#Import-PfxCertificate -FilePath $username -Password $securePassword -CertStoreLocation $certificateLocation;
}
certutil -addstore "Root" cacert.crt | out-null

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