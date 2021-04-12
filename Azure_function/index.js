/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const fetch = require('node-fetch');
const handleMessage = require('./lib/engine');

const msiEndpoint = process.env.MSI_ENDPOINT;
const msiSecret = process.env.MSI_SECRET;

const parameters = {
    idScope: process.env.ID_SCOPE,
    primaryKeyUrl: process.env.IOTC_KEY_URL
};

let kvToken;

module.exports = async function (context, req) {
    try {

        /* Add the compute or data transformation code here
         * In this example we have a mini pipeline of operations:
         *
         * 1 - Convert the telemetry from a comma seperated values (CSV) to JSON
         * 2 - Convert the temperature value from centigrade to fahrenheit
         * 3 - Enrich the telemetry from the external source Open Weather Service
         * 
        */

        // transform the data from CSV to JSON
        let computedTelemetry = await convertFromCsvToJson(context, req);

        // convert the temperatures from centigrade to fahrenheit
        computedTelemetry.temp = await convertTemperature(context, computedTelemetry.temp);

        // get external weather data
        const openWeatherAppId = '<add your open weather API here: https://openweathermap.org/api>';
        computedTelemetry.weather = await getWeatherData(context, openWeatherAppId, computedTelemetry.lat, computedTelemetry.lon);

        // get the deviceId from the incoming message data
        let device = {};
        device.deviceId = req.body.deviceId;
        // enqueuedTime from the export message is used so enqueue time for computed values is 
        await handleMessage({ ...parameters, log: context.log, getSecret: getKeyVaultSecret }, device, computedTelemetry, req.body.enqueuedTime);
        
    } catch (e) {
        context.log('[ERROR]', e.message);

        context.res = {
            status: e.statusCode ? e.statusCode : 500,
            body: e.message
        };
    }
}

/**
 * Is a number helper function
 */
function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Transform the data from CSV to JSON
 */
async function convertFromCsvToJson(context, req) {
    let jsonData = {}
    const columnHeaders = ['temp', 'humidity','lat', 'lon'];
    const csvData = req.body.telemetry.data.split(',');
    if (columnHeaders.length === csvData.length) {
        for (let i = 0; i < csvData.length; i++) {
            csvData[i] = csvData[i].trim();
            if (isNumeric(csvData[i])) {
                jsonData[columnHeaders[i]] = csvData[i] * 1;
            } else {
                jsonData[columnHeaders[i]] = csvData[i];
            }
        }
    } else {
        context.log('Error: The number of headers and CSV elements do not match')
    }
    return jsonData;
}

/**
 * Convert temperature from centigrade to fahrenheit 
 */
async function convertTemperature(context, tempInCentigrade) {
    return ((tempInCentigrade * (9 / 5)) + 32).toFixed(2) * 1;
}

/**
 * Fetch weather data from Open Weather Service
 */
async function getWeatherData(context, appid, lat, lon) {
    // fetch weather data from Open Weather Service
    if (lat && lon) {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${appid}&exclude=hourly,daily,minutely&units=imperial`;
        const options = {
            method: 'GET',
        };
        const weatherDataResponse = await fetch(weatherUrl, options).then(res => res.json());
        let weather = {};
        weather.weather_temp = weatherDataResponse.current.temp;
        weather.weather_humidity = weatherDataResponse.current.humidity;
        weather.weather_pressure = weatherDataResponse.current.pressure;
        weather.weather_windspeed = weatherDataResponse.current.wind_speed;
        weather.weather_clouds = weatherDataResponse.current.clouds;
        weather.weather_uvi = weatherDataResponse.current.uvi;
        return weather;
    }
}

/**
 * Fetches a Key Vault secret. Attempts to refresh the token on authorization errors.
 */
async function getKeyVaultSecret(context, secretUrl, forceTokenRefresh = false) {
    if (!kvToken || forceTokenRefresh) {
        const url = `${msiEndpoint}/?resource=https://vault.azure.net&api-version=2017-09-01`;
        const options = {
            method: 'GET',
            headers: { 'Secret': msiSecret }
        };

        try {
            context.log('[HTTP] Requesting new Key Vault token');
            const response = await fetch(url, options).then(res => res.json())
            kvToken = response.access_token;
        } catch (e) {
            context.log('fail: ' + e);
            throw new Error('Unable to get Key Vault token');
        }
    }

    url = `${secretUrl}?api-version=2016-10-01`;
    var options = {
        method : 'GET',
        headers : { 'Authorization' : `Bearer ${kvToken}` },
    };

    try {
        context.log('[HTTP] Requesting Key Vault secret', secretUrl);
        const response = await fetch(url, options).then(res => res.json())
        return response && response.value;
    } catch(e) {
        if (e.statusCode === 401 && !forceTokenRefresh) {
            return await getKeyVaultSecret(context, secretUrl, true);
        } else {
            throw new Error('Unable to fetch secret');
        }
    }
}
