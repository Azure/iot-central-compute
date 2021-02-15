# iot-central-compute

A simple way to do data transformation, compute, and data enhancement on data sent to Azure IoT Central

# Introduction

Sometimes your device might not be able to send the right data format to Azure IoT Central or you may want to compute values or enhance the telemetry with external data services.  In this example we will use the [Azure IoT Central Bridge](https://github.com/Azure/iotc-device-bridge) code to do a simple compute pipeline using Azure Functions.

In our pipeline we will recieve data in comma seperated value (CSV) format.  The pipeline will do the following operations:

1. Convert from CSV format to a JSON format that IoT Central understands
2. The temperature value will be converted from degrees centigrade to degrees fahrenheit 
3. The data will be enhanced by pulling weather data from Open Weather service for the passed in latitude and longitude values

Data input has the following format:

```
"<temperature in degrees C>, <humidity>, <latitude>, <longitude>"
```

Format expected by IoT Central:

```
{
    "temp": <temperature in degrees F>,
    "humidity": <humidity>,
    "lat": <latitude>,
    "lon": <logitude>,
    "weather": {
        "weather_temp": <temperature at lat/lon>,
        "weather_humidity": <humidity at lat/lon>,
        "weather_pressure": <pressure at lat/lon>,
        "weather_windspeed": <wind speed at lat/lon>,
        "weather_clouds": <cloud cover at lat/lon>,
        "weather_uvi": <UVI at lat/lon>
    }
}
```


# Prerequisites

1. Have a working [IoT Central application](https://apps.azureiotcentral.com/myapps).
2. Have a working Azure IoT Central Bridge setup to implement this example against.  To do this follow the tutorial [Build the IoT Central device bridge to connect other IoT clouds to IoT Central](https://docs.microsoft.com/en-us/azure/iot-central/core/howto-build-iotc-device-bridge).
3. Get an application API key from the [Open Weather service](https://openweathermap.org/api).  This is free with limited usage of the service, just create an account and follow the instructions to create an application API key that we will need in the next step.


# Implementing the compute pipeline

Go to the [Azure Portal](https://portal.azure.com/) and navigate to where the Azure IoT Central Device Bridge was deployed.  Scroll the left hand navigation down to the "Development Tools" section and click "App Service Editor (Preview)".  You will then need to clik the "Go ->" link in the right panel to open a new tab with the App Service Editor page.  Here you can easily edit the code for your Azure Function.  We are going to need to do two changes here:

1. Open the index.js file and select all the code in index.js and delete it.  Now replace it with the index.js code from this repository.  You will also need to paste in your Open Weather API key you created in the prerequisites above.  This is done in the space on line 38 of the index.js file.
2. Open the lib/engine.js file and select all the code in index.js and delete it.  Now replace it with the Azure_function/lib/engine.js code from this repository.  Alternatively you can just paste in the following code at line 55 in the file as this is the only change we are making in the code:

```
        // add a message property that we can look for in data export to not re-compute computed telemetry
        message.properties.add('computed', true);
```

Once the above steps are completed return to the Azure Function Overview page and restart the Azure Function just to make sure all the changes are picked up.


# Setting up the Azure IoT Central application

