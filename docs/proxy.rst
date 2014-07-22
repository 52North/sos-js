Proxy Configuration
===================

.. index:: SOS.Proxy, CORS, proxy.cgi, allowedHosts

By default, the SOS.js library is configured to use a proxy for communicating with a backend SOS instance.  This is to overcome `CORS`_ restrictions that web browsers place on javascript code.  If you wish to use the SOS.js library without a proxy, then your backend SOS instance must be setup for CORS [#SOS_setup_for_CORS]_.  Otherwise, you must run a proxy on the web server that hosts SOS.js to marshall all requests from the SOS.js client library to your SOS backend.  This is so that to the client (web browser), it looks as though the data from the SOS are a local resource.

If your SOS instance is setup for CORS, then add the following line somewhere near the start of your javascript (for example, in the page's ``init`` function, before instantiating any other SOS.js objects)::

  SOS.Proxy.disable();

This will then work without the need for a proxy.

If your SOS instance isn't setup for CORS, then install the ``proxy.cgi`` script (distributed with OpenLayers) into a path under your web server that is capable of running `CGI binaries`_.  (This web server is where you intend to host SOS.js.)  For example, the default path under Apache is /path/to/web-server-root/cgi-bin, which resolves to a URL of http://your.web-server/cgi-bin/proxy.cgi.  Edit the ``proxy.cgi`` script, and add the hostname and port of your SOS instance (and any others you wish to query) to the ``allowedHosts`` array.  For example::

  allowedHosts = [mysoshost.mydomain:8080, localhost:8080]

The SOS.js library should now successfully communicate with your backend SOS instance.  (To check, see that the examples pages work.)  If you install the ``proxy.cgi`` script to a different path (it must still be capable of running CGI binaries), then you'll need to tell the ``SOS.Proxy`` object where to find it.  You can do this by adding the following line somewhere near the start of your JavaScript (again, for example, in a page's ``init`` function)::

  SOS.Proxy.enable({url: "/alternative/path/to/cgi-bin/proxy.cgi?url="}); 
  
  
.. rubric:: Footnotes
.. [#SOS_setup_for_CORS] For example, if you have installed the `52°North SOS`_ backend, then you need to `configure Tomcat for CORS`_. Depending on the used version this configuration can be included.


.. _CORS: http://en.wikipedia.org/wiki/Cross-origin_resource_sharing
.. _configure Tomcat for CORS: http://tomcat.apache.org/tomcat-7.0-doc/config/filter.html#CORS_Filter
.. _52°North SOS: http://52north.org/communities/sensorweb/sos/
.. _CGI binaries: http://en.wikipedia.org/wiki/Common_Gateway_Interface