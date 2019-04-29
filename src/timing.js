'use strict'

const assert = require('assert');
const http = require('http');
const https = require('https');
const TestTypes = require('./entities/tests');
const URL = require('url');
const Merge = require('lodash.merge');
const TIMEOUT_IN_MILLISECONDS = 30 * 1000;
const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e6;
const Logger = require('./logger/log');

/**
 * Creates a request and collects HTTP timings
 * @function request
 * @param {Object} options
 * @param {String} [options.method='GET']
 * @param {String} options.protocol
 * @param {String} options.hostname
 * @param {Number} [options.port]
 * @param {String} [options.path]
 * @param {Object} [options.headers={}]
 * @param {String} [options.body]
 * @param {Function} callback
 */
function request({
    method = 'GET',
    testType = 1,
    protocol,
    hostname,
    href,
    port,
    path,
    headers = {},
    body
} = {}) {
    return new Promise(function (resolve) {
        // Validation
        assert(protocol, 'options.protocol is required')
        assert(['http:', 'https:'].includes(protocol), 'options.protocol must be one of: "http:", "https:"')
        assert(hostname, 'options.hostname is required')
        //assert(callback, 'callback is required')

        // Initialization
        const eventTimes = {
            // use process.hrtime() as it's not a subject of clock drift
            startAt: process.hrtime(),
            dnsLookupAt: undefined,
            tcpConnectionAt: undefined,
            tlsHandshakeAt: undefined,
            firstByteAt: undefined,
            endAt: undefined
        }

        // Making request
        const req = (protocol.startsWith('https') ? https : http).request({
            protocol,
            method,
            hostname,
            port,
            path,
            headers
        }, (res) => {
            let responseBody = ''

            req.setTimeout(TIMEOUT_IN_MILLISECONDS);

            // Response events
            res.once('readable', () => {
                eventTimes.firstByteAt = process.hrtime();
            })
            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            // End event is not emitted when stream is not consumed fully
            // in our case we consume it see: res.on('data')
            res.on('end', () => {
                eventTimes.endAt = process.hrtime();

                resolve({
                    protocol: protocol,
                    location: href,
                    testType: testType,
                    headers: res.headers,
                    timings: getTimings(eventTimes),
                    body: responseBody,
                    totalBytes: Buffer.byteLength(responseBody, 'utf8') //content-length is the same
                });
            })
        })

        // Request events
        req.on('socket', (socket) => {
            socket.on('lookup', () => {
                eventTimes.dnsLookupAt = process.hrtime();
            })
            socket.on('connect', () => {
                eventTimes.tcpConnectionAt = process.hrtime();
                if ((testType === TestTypes["DNS-LOOKUP"]) && (protocol == 'http:')) resolve({
                    protocol: protocol,
                    location: href,
                    testType: testType,
                    timings: getTimings(eventTimes),
                });
            })
            socket.on('secureConnect', () => {
                eventTimes.tlsHandshakeAt = process.hrtime();
                if ((testType === TestTypes["DNS-LOOKUP"]) && (protocol == 'https:')) resolve({
                    protocol: protocol,
                    location: href,
                    testType: testType,
                    timings: getTimings(eventTimes),
                });
            })
            socket.on('timeout', () => {
                req.abort();

                const err = new Error('ETIMEDOUT');
                err.code = 'ETIMEDOUT';
                resolve({
                    protocol: protocol,
                    location: href,
                    testType: testType,
                    timings: null,
                    err: err
                });
            })
        })
        req.on('error', (err) => {
            resolve({
                protocol: protocol,
                location: href,
                testType: testType,
                timings: null,
                err: err
            });
        });

        // Sending body
        if (body) {
            req.write(body)
        }

        if (testType !== TestTypes["DNS-LOOKUP"]) req.end();
    });
}

/**
 * Calculates HTTP timings
 * @function getTimings
 * @param {Object} eventTimes
 * @param {Number} eventTimes.startAt
 * @param {Number|undefined} eventTimes.dnsLookupAt
 * @param {Number} eventTimes.tcpConnectionAt
 * @param {Number|undefined} eventTimes.tlsHandshakeAt
 * @param {Number} eventTimes.firstByteAt
 * @param {Number} eventTimes.endAt
 * @return {Object} timings - { dnsLookup, tcpConnection, tlsHandshake, firstByte, contentTransfer, total }
 */
function getTimings(eventTimes) {
    return {
        // There is no DNS lookup with IP address
        dnsLookup: eventTimes.dnsLookupAt !== undefined ?
            getHrTimeDurationInMs(eventTimes.startAt, eventTimes.dnsLookupAt) : undefined,
        tcpConnection: getHrTimeDurationInMs(eventTimes.dnsLookupAt || eventTimes.startAt, eventTimes.tcpConnectionAt),
        // There is no TLS handshake without https
        tlsHandshake: eventTimes.tlsHandshakeAt !== undefined ?
            (getHrTimeDurationInMs(eventTimes.tcpConnectionAt, eventTimes.tlsHandshakeAt)) : undefined,
        firstByte: getHrTimeDurationInMs((eventTimes.tlsHandshakeAt || eventTimes.tcpConnectionAt), eventTimes.firstByteAt),
        contentTransfer: getHrTimeDurationInMs(eventTimes.firstByteAt, eventTimes.endAt),
        total: getHrTimeDurationInMs(eventTimes.startAt, eventTimes.endAt),
    }
}

/**
 * Get duration in milliseconds from process.hrtime()
 * @function getHrTimeDurationInMs
 * @param {Array} startTime - [seconds, nanoseconds]
 * @param {Array} endTime - [seconds, nanoseconds]
 * @return {Number} durationInMs
 */
function getHrTimeDurationInMs(startTime, endTime) {
    if (!endTime || !startTime) return null;
    const secondDiff = endTime[0] - startTime[0]
    const nanoSecondDiff = endTime[1] - startTime[1]
    const diffInNanoSecond = secondDiff * NS_PER_SEC + nanoSecondDiff
    return diffInNanoSecond / MS_PER_NS
}
const defaultParams = {
    headers: {
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.8,he;q=0.6,de;q=0.4'
    }
};

module.exports = async function (location, params) {
    try {
        params = Merge(URL.parse(location), defaultParams, params);
        return await request(params);
    } catch (err) {
        err.message = `${err.message} for ${location}`;
        Logger.error(err);
        return err;
    }
};