Step-by-step guide for 52°North SOS and SOS.js
==============================================

This documentation is contributed by https://github.com/simonabadoiu.

This is a short tutorial on how you can make the SOS.js project run with the `52°North SOS`_.

52°North SOS Server Installation
--------------------------------

In order to use the sos-js library and examples with the 52°North SOS, you need to deploy the SOS on a local server - Apache Tomcat for example. The `SOS installation guide`_ which describes two options for deploying the SOS on a local server:

- Build the SOS webapp and deploy it on a local server
- Download the war file and deploy it on a local server

For SOS.js you will need to package the war file using the develop profile (``mvn package -P develop``) so that the SOS 1.0.0 binding is included. Therefore you must build the application and cannot simply download the war file.

SOS.js Deployment
-----------------

Now that you have the SOS running on localhost, you can start deploying the sos-js application.
Here are the steps that will lead you to an working sos-js application:

- Read the SOS.js readme file on github
- Clone the SOS.js github repository
- Download an HTTP server - for example Apache HTTP Server
- Copy the SOS.js project on the server - for the Apache server, you have to copy the files in the ``www`` folder
- The latest version of the `52°North SOS`_ is set up for CORS, so you can simply disable the proxy behaviour. In order to do this, you have to call the ``SOS.Proxy.disable()`` function, see :doc:`proxy`.
- Modify the test html documents from the examples folder, in order to make this work with your locally deployed SOS.

  - In almost each html test file, an URL is set for the SOS client. You have to change this URL with one that points to your local SOS. 
  - Your local URL could look like this: http://localhost:8080/52n-sos-webapp/sos/kvp

After correctly passing through all this steps, your SOS.js application will look similar with the `SOS.js demo`.

.. _52°North SOS: http://52north.org/communities/sensorweb/sos/
.. _SOS installation guide: https://wiki.52north.org/bin/view/SensorWeb/SensorObservationServiceIVDocumentation#Installation
.. _SOS.js demo: http://52north.github.io/sos-js/