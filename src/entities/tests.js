module.exports = {
    "DNS-LOOKUP": {
        id: 1,
        generate: (result) => {
            var res = {};
            res["DNS-LOOKUP"] = {
                "location": result.location
            }
            res["DNS-LOOKUP"].message = `${result.err ? 'Failed to perform' : 'Successfuly performed'} DNS lookup to ${result.location}`;
            if (!result.err && result && result.timings && result.timings.dnsLookup) {
                var latency = result.timings.dnsLookup / 1000;
                res["DNS-LOOKUP"].latency = `${latency}sec`;
            };
            return res;
        }
    },
    "DOWN-BANDWIDTH": {
        id: 2,
        generate: (result) => {
            var res = {};
            res["DOWN-BANDWIDTH"] = {
                "location": result.location
            };
            var latency = null,
                totalBits = null;
            if (!result.err && result && result.timings && result.timings.total) {
                latency = result.timings.total / 1000;
                res["DOWN-BANDWIDTH"].latency = `${latency} sec`;
            }
            if (!result.err && result && result.totalBytes) {
                totalBits = (result.totalBytes / 8);
                res["DOWN-BANDWIDTH"].totalBits = `${totalBits} bit`;
            }
            res["DOWN-BANDWIDTH"].message = `${result.err ? 'Failure' : 'Successful'} ${result.protocol} Connection to ${result.location} ${!result.err ? `[Download bandwidth of ${totalBits}Mbps, latency of ${latency}seconds]` : ''}`;
            return res;
        }
    }
}