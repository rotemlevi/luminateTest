const request = require('./src/timing');
const path = require('path');
const TestTypes = require('./src/entities/tests');
const Reporter = require('./src/reporter/report');
const Logger = require('./src/logger/log');
const Dal = require('./src/dal/tingodb');
const Alert = require('./src/alerts/alerts');
const defaulThreshold = 0.20;
const defaultEmail = 'rotem85.levi@gmail.com';
let Configuration = {
    tests: []
};

try {
    Configuration = require(path.join(process.cwd(), 'configuration.json'));
} catch (e) {
    Logger.error(e);
}

function getBandwidth(result) {
    if (!result) return;
    if ("DOWN-BANDWIDTH" === result.testType) {
        var latency, totalBits = 0;
        if (result.err) return;
        if (result.timings && result.timings.total) {
            latency = result.timings.total / 1000;
        }
        if (result.totalBytes) {
            totalBits = (result.totalBytes / 8);
        }
        return totalBits / latency;
    }
}

(async function () {
    try {
        var tests = [];
        Object.entries(Configuration.tests).forEach(test => {
            var testType = test[0];
            var hosts = test[1].hosts;
            hosts.forEach(host => {
                tests.push(request(host.hostName, {
                    testType: testType
                }));
            });
        });

        var results = await (Promise.all(tests));

        results = results.forEach(async (result) => {
            var entry = null;
            if (TestTypes[result.testType]) entry = TestTypes[result.testType].generate(result);
            var prevResult = await Dal.get(result);
            var currBandWidth = getBandwidth(result);
            var prevBandWidth = getBandwidth(prevResult);

            try {
                var alert = Configuration.tests["DOWN-BANDWIDTH"].alert;
                if ((alert) && (alert.enabled)) {
                    if (("DOWN-BANDWIDTH" === result.testType)) {
                        var sendAlert = Math.abs(currBandWidth - prevBandWidth) > (alert.threshold || defaulThreshold);
                        if (sendAlert) {
                            var msg = `Bandwidth was changed from ${prevBandWidth} to ${currBandWidth} for ${result.location}`;
                            var subject = `${TestTypes} Changed`;
                            var to = alert.to || defaultEmail;
                            Alert.alert(to, subject, msg);
                        }
                    }
                }
            } catch (err) {
                Logger.error(err);
            }

            Dal.set(result);

            result.err && entry ? Reporter.reportFailure(entry) : Reporter.reportSuccess(entry);
        });
    } catch (err) {
        Logger.error(err);
    }

})();