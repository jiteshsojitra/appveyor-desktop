[![Build status](https://ci.appveyor.com/api/projects/status/in3wi2uwq6p1cq37?svg=true)](https://ci.appveyor.com/project/jiteshsojitra/appveyor-desktop)

## Configurations:

Install latest node, npm, spectron and install required packages along with dependencies.
```
cd appveyor-desktop
npm install
npm install -g mocha spectron mochawesome
```

## Instructions:
Pre-requisite to run the ZimbraX Desktop tests on a local machine (Windows/Mac):

1. ZimbraX desktop app is installed on the machine.
2. SMIME feature should be enabled for respective user accounts.
3. Update conf/config.js values or set environment variables defined in framework/soap-client.js.

## Run spectron tests:
Use mocha command to run the tests:
```
mocha <path-to-the-testcase-file>

mocha --recursive <path-to-the-testcases-folder> -f "<search-pattern>"
```
```
mocha --recursive tests/spectron/tests -f "Smoke"

TEST_SUITE='Smoke' mocha tests/spectron/conf/configure.js

TEST_SUITE='Smoke' HTML_REPORT_PATH='test-reports/spectron' mocha --recursive tests/spectron/tests -f 'Smoke' --retries 1 --reporter mochawesome --reporter-options reportDir=test-reports/spectron > tee test-reports/spectron/report.txt
```

To run all the tests using npm command
```
npm run pretest:spectron

npm run test:spectron:full
```