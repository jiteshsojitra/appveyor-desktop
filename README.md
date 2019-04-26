## Configurations:

Install latest node, npm, spectron and install required packages along with dependencies. Please see zm-x-web project README for basic configuration first.
```
cd zm-x-web
npm install
npm install -g spectron
npm install -g mocha
```

## Instructions:

Pre-requisite to run the ZimbraX Desktop tests on a local machine (Windows/Mac):

1. ZimbraX desktop app is installed on the machine.
2. SMIME certificats for the users mentioned in `tests/spectron/conf/configure.js` are installed on the machine.
3. SMIME feature should be enabled for respective user accounts.
4. `SERVER_HOST_URL` environment variable is set or entered in config.js file.

## Run spectron tests
To run all the tests in a test file using mocha command
```
mocha <path-to-the-testcase-file>
mocha --recursive <path-to-the-testcases-folder> -f "<search-pattern>"
```
```
mocha --recursive tests/spectron/tests -f "Smoke"

TEST_SUITE='Smoke' mocha tests/spectron/conf/configure.js

TEST_SUITE='Smoke' HTML_REPORT_PATH='test-reports/spectron' mocha --recursive tests/spectron/tests -f 'Smoke' --retries 1 --reporter mochawesome --reporter-options reportDir=test-reports/spectron
```

To run all the tests using npm command
```
npm run pretest:spectron

npm run test:spectron:smoke
```