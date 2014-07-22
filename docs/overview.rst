Overview of the SOS.js Library
==============================

.. index:: modules, classes, files, extension, style sheet, SOS.js, SOS.Ui.js, OpenLayers, flot, jQuery

The library consists of a number of modules, which along with their dependencies build a layered abstraction for communicating with a SOS.

The core module - ``SOS.js``, contains a number of objects that encapsulate core concepts of SOS, such as managing the service connection parameters, the service's capabilities document, methods to access the service's Features of Interest (FOIs), offerings, observed properties etc.  It also contains various utility functions, available as methods of the ``SOS.Utils`` object. The objects of this module are:

- ``SOS``
- ``SOS.Offering``
- ``SOS.Proxy``
- ``SOS.Utils``

This module is built on top of `OpenLayers`_, for low-level SOS request/response handling.

The user interface module - SOS.Ui.js, contains the UI components of the library.  These components can be used standalone, but are also brought together in the default ``SOS.App`` object as a (somewhat) generic web application.  The objects of this module are:

- ``SOS.Plot``
- ``SOS.Table``
- ``SOS.Map``
- ``SOS.Menu``
- ``SOS.Info``
- ``SOS.App``

This module is built on top of `OpenLayers`_ which provides simple mapping for discovery; `jQuery`_ for the UI and plumbing; and `flot`_, which is a jQuery plugin, for the plotting.

In addition, there are a number of separate modules that contain UI extension components that are built on top of the above standard components.

- ``SOS.MapSet.js``
- ``SOS.Plot.Rose.js``
- ``SOS.Plot.Stuve.js``

All the styling for the UI components is contained in the library style sheet - ``SOS.Styles.css``.


.. _OpenLayers: http://openlayers.org/
.. _jQuery: http://jquery.com/
.. _flot: http://www.flotcharts.org/