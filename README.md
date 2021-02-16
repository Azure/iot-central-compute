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


# Pre-requisites

1. Node.js installed for running the sample device code [node.js install files](https://nodejs.org/en/)
2. Have a working [IoT Central application](https://apps.azureiotcentral.com/myapps).
3. Have a working Azure IoT Central Bridge setup to implement this example against.  To do this follow the tutorial [Build the IoT Central device bridge to connect other IoT clouds to IoT Central](https://docs.microsoft.com/en-us/azure/iot-central/core/howto-build-iotc-device-bridge).
4. Get an application API key from the [Open Weather service](https://openweathermap.org/api).  This is free with limited usage of the service, just create an account and follow the instructions to create an application API key that we will need in the next step.


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

Assuming you have created an Azure IoT Central account in the prerequisite step above we now need to add a device model and setup the data export.  First lets add the device template to our application by going to our application and following the list of instructions below:

* Select "Device templates" in the laft hand navigation rail.
* Click the '+ New" link top left and select "IoT device" and click "Next:Customize".
* Give your template a name (say "compute"), do not check the "Gateway device" box and click "Next: Review".
* Now click "Create"

You have created an empty device template which we now need to fill with a device model by:

* Select "Import a model" and choose the "model.json" file from this repository (same directory as this README file)
* The model will be imported and you will see the imported description of the data shown
* Publish the model so it can be used in your application by clicking the "Publish" link at the top of the page

You now have a working device model that you can further enhance by adding Views if you feel like it but is not necessary to see this sample in operation.  More information on device templates in IoT Central can be found in the documentation [here](https://docs.microsoft.com/en-us/azure/iot-central/core/concepts-device-templates).

Let's now setup the data export to send data to our Azure Function:

* Select "Data export" in the laft hand navigation rail.
* Click the '+ New export" link top left and give your data export a name (say "compute export").
* We need to add a couple of filters so we only export the data we want computation done on so click the "+ Filter" and select item "Device template", select Operator "Equals", and select "Value" and the name of the device template you just created (in my example above "compute").
* We also need a message filter so we can differentiate computed values from none-computed.  This will prevent us from sending computed values back through for computed in the engine.js file of the Azure Function we added code to add a message property called "computed" we should only export data to our function if that value is NOT present.  Select "+ Message property filter" and enter the name value "computed", then for operator select "Does not exist".
* We do not need any enrichments so lets create a destination to our Azure Function
* Click the link under "Destinations" called "create a new one".  Provide a destination name (Say "compute function"), for "Destination type" select "Webhook".  For the Callback URL select paste in the URL for the azure function (this can be found in the overview screen for the bridge function you created by clicking "Get Function Url").  The "Authorization" should be left as "No Auth".  Now click "Create" and you have created the link to the Azure Function.
* Click "+ Destination" and select the destination you just created ("compute function").
* click "Save" at the top of the page and after a minute or so you should see the "Export status" show as Healthy.

We now have all the necessary setup done on our IoT Central application, lets send some telemetry data from a device and see if it works.


# Sending data from a device and seeing it get transformed and computed

A sample device is included in the repository to send random ranged data to IoT Central in the CSV data format.  The device code can be found in the file "device/device.js" and is run using node.js.  First we need to provide the device with some information so it can connect to our IoT Central application.

In the device.js file the following information needs to be provided:

```
// These values need to be filled in from your Azure IoT Central application
//
const scopeId = "<IoT Central Scope Id value>";
const groupSasKey = "<IoT Central Group SAS key>";
//
/////////////////////////////////////////////////////////////////////////////
```

The Scope Id and the Group SAS key can be found in the IoT Central application by clicking the Administration -> Device connection in the left hand navigation.  Copy the ID Scope value and the "SAS-IoT-Devices" primary key into the code replacing the place holder text.  Save the file and from the command line in the "iot-central-compute\device" directory issue the following command to run the device:

```
node device.js
```
 You should see the following similar output:

 ```
 registration succeeded
assigned hub=iotc-2bd611b0-755c-438a-b714-f01f43aab2ef.azure-devices.net
deviceId=computeDevice
Client connected
send status: MessageEnqueued [{"data":"33.23, 69.09, 30.7213, -61.1192"}]
send status: MessageEnqueued [{"data":"2.43, 75.86, -2.6358, 162.935"}]
send status: MessageEnqueued [{"data":"6.19, 76.55, -14.3538, -82.314"}]
send status: MessageEnqueued [{"data":"33.26, 48.01, 71.9172, 48.6606"}]
send status: MessageEnqueued [{"data":"40.5, 36.41, 14.6043, 14.079"}]
 ```

 If you now check your application you should see a device called "computeDevice" under the "Compute" device template name:

 ![Device computeDevice showing up](https://github.com/iot-for-all/iot-central-compute/blob/main/assets/deviceshowingup.png)

 Clicking on the devie and looking at the Raw data view we should now see two different telemetry lines one after the other showing up around every five seconds:

 ![telemtry coming through](https://github.com/iot-for-all/iot-central-compute/blob/main/assets/telemetry.png)

 We can see the device CSV formatted telemetry come through first then the computed telemetry coming through after with the temperature in degrees fahrenheit and the additional weather service data all in JSON format and correctly recognized and interpreted by the IoT Central application.  The computed data coming back into Azure IoT Central comes in with the same hub ingestion timestamp as the original CSV did.  This is not reflected in the raw data view as they use a different time stamp.  However if you were to use the "Analytics" page and plot an original telemetry element against a computed telemetry element they would align exactly at the same time.

 This concludes all the steps to enabling data export, and compute via an Azure function using the Azure IoT Central device bridge as a starting point.  At this point you can go ahead and make changes to the code in index.js to add your own functionality for the custom procudres you need.  Enjoy!


 # Limitations and things to consider

Because the data comes through the IoT hub twice when using the Azure Function as we are it will consume two messages per message the device sends.  This may consume more messages than your monthly allotment and increase the cost of using Azure IoT Central.  One way around this would be to use the Azure IoT Central device bridge in it's original form and from your device call the Azure Function via HTTPS and send the telemetry and device identity in where it can be transformed, computed, augmented and finally sent to the Azure IoT Central application.  The limitation here will be that your device will be one way only with telemetry being sent from the device to the cloud but no device twin or commands being enabled for that device.

The processing time in the Azure function must not exceed 5 minutesso ensure that the compute performed does not exceed this time.  Ideally for performance and scaling the processing and augmentation of data should be in the order of seconds.  If you really need long running jobs then you could look at converting this code to use [Azure Durable Functions](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview?tabs=csharp) especially if you are looking to data agregation over time windows for example.