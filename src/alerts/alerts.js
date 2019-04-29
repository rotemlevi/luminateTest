const Provider = require('sendmail')();
const Logger = require('../logger/log');

function sendEmail(to, subject, html) {
    Provider({
        from: 'testr@luminate.com',
        to,
        subject,
        html,
    }, function (err, reply) {
        Logger.error(err);
    });
}

module.exports = {
    alert: (to, subject, msg) => sendEmail(to, subject, msg)
};