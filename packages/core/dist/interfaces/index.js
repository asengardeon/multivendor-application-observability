"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthStatus = exports.TelemetryStatus = void 0;
var TelemetryStatus;
(function (TelemetryStatus) {
    TelemetryStatus["OK"] = "OK";
    TelemetryStatus["ERROR"] = "ERROR";
    TelemetryStatus["UNSET"] = "UNSET";
})(TelemetryStatus || (exports.TelemetryStatus = TelemetryStatus = {}));
// --- Health Checks ---
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["UP"] = "UP";
    HealthStatus["DOWN"] = "DOWN";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
