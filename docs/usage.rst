Usage
=====

Here we discuss examples of using the various objects of the library.  For fully working examples, see the examples directory in the library distribution.

.. index:: SOS.Offering, SOS

SOS
^^^

The core SOS object can be used for low-level communication with a SOS.  After instantiating a SOS object, the user then interacts with the object via a series of event handling callbacks.

To instantiate a SOS object, we pass it a number of options.  Only the URL to the SOS is required, so at its simplest, this will suffice::

  var options = {
    url: "http://sosmet.nerc-bas.ac.uk:8080/sosmet/sos"
  };

  var sos = new SOS(options);

Typically the first thing that is required after instantiation, is to fetch the capabilities document of the SOS.  As this call is asynchronous, we need to setup a callback to handle the ``sosCapsAvailable`` event, which signifies that the SOS object has received and parsed the capabilities document from the given SOS.  We can accomplish this via the following::

  sos.registerUserCallback({
    event: "sosCapsAvailable",
    scope: this,
    callback: capsHandler
  });

  sos.getCapabilities();

  function capsHandler(evt) {
  ...

whereupon our ``capsHandler`` function can then inspect the capabilities of the SOS via the available method calls of the SOS object [#SOSCapabilities]_.  As a convenience, we can pass the name of our callback function as an argument to the ``getCapabilities`` call, which will then register this callback function to handle the ``sosCapsAvailable`` event with a scope of ``this``; so identical to the above explicit ``registerUserCallback`` call::

  sos.getCapabilities(capsHandler);

To unregister a callback, we can issue the following::

  sos.unregisterUserCallback({
    event: "sosCapsAvailable",
    scope: this,
    callback: capsHandler
  });

Once we have our capabilities document, we can inspect the available offerings and FOIs of the given SOS::

  var offIds = sos.getOfferingIds();
  var offNames = sos.getOfferingNames();
  var foiIds = sos.getFeatureOfInterestIds();
 
SOS.Offering
^^^^^^^^^^^^

Once we've identified an offering we're interested in, we can fetch a SOS.Offering object that encapsulates that offering::

  var offering = sos.getOffering(offId);
  var offering = sos.getOfferingByName(offName);

or we can fetch an array of SOS.Offering objects pertaining to a given FOI or procedure::

  var offerings = sos.getOfferingsForFeatureOfInterestId(foiId);
  var offerings = sos.getOfferingsForProcedureId(procId);

We can inspect the details of a particular offering, via its method calls:: 

  var foiIds = offering.getFeatureOfInterestIds();
  var procIds = offering.getProcedureIds();
  var propIds = offering.getObservedPropertyIds();
  var propNames = offering.getObservedPropertyNames();

and furthermore we can fetch observations of the offering's observed properties.  By default, observations for all the offering's observed properties will be retrieved, however, often we may only want observations for a particular observed property, or subset of observed properties.  This can be achieved by filtering the offering's observed properties, thus::

  // Fetch the air temperature only
  offering.filterObservedProperties("air_temperature");

  // Fetch the wind data only
  offering.filterObservedProperties(["wind_speed", "wind_direction"]);

To reset an offering's observed properties list, we unfilter::

  offering.unfilterObservedProperties();

Similarly, we may only be interested in observations from a single FOI from an offering (for example, a single station's observations from a multi-station offering).  To achieve this, we simply set the ``foiId`` property of the SOS.Offering object, thus::

  offering.foiId = "foi_34579";

To retrieve observations for all an offering's FOIs, we simply reset this property::

  offering.foiId = null;

Once we have specified the desired observed property(s) and FOIs, we can fetch observation records, given a date range [#datetime_format]_.  This is an asynchronous call, so just like the capabilities call above, we can explicitly setup a callback event handler::

  offering.registerUserCallback({
    event: "sosObsAvailable",
    scope: this,
    callback: obsHandler
  });

  offering.getObservations(startDatetime, endDatetime);

  function obsHandler(evt) {
  ...

or alternatively, we can use the convenience of passing our callback function as an argument to the ``getObservations`` call::

  offering.getObservations(startDatetime, endDatetime, obsHandler);

In our observation handler, we can then iterate over the observation records that were returned by the SOS, using the ``getCountOfObservations`` and ``getObservationRecord`` method calls.  For example, to display the data in an HTML table, we could do something like::

  for(var i = 0, len = offering.getCountOfObservations(); i < len; i++) {
    var ob = offering.getObservationRecord(i);
    tbody += '<tr>';
    tbody += '<td>' + ob.observedPropertyTitle + '</td>';
    tbody += '<td>' + ob.time + '</td>';
    tbody += '<td>' + ob.result.value + ' ' + ob.uomTitle + '</td>';
    tbody += '</tr>';
  }

Note that if the requested observations are not pre-filtered by specifying observed property and FOI (see above), then we will probably want to post-filter them.  This can be achieved by calling ``getFilteredObservationRecord``, along with a suitable filter, instead of calling ``getObservationRecord``.  For example, if we have requested observations for all FOIs of a given multi-FOI offering, and wish to have a separate table for each FOI, then we could do something like::

  var foiIds = this.getFeatureOfInterestIds();

  for(var i = 0, flen = foiIds.length; i < flen; i++) {
    var filter = {foiId: foiIds[i]};

    for(var j = 0, olen = this.getCountOfObservations(); j < olen; j++) {
      var ob = this.getFilteredObservationRecord(j, filter);

      if(ob) {
        if(tcaption.length < 1) {
          var foi = this.getFeatureOfInterestFromObservationRecord(ob);

          if(foi) {
            tcaption = foi.attributes.name;
          }
        }
        tbody += '<tr>';
        tbody += '<td>' + ob.observedPropertyTitle + '</td>';
        tbody += '<td>' + ob.time + '</td>';
        tbody += '<td>' + ob.result.value + ' ' + ob.uomTitle + '</td>';
        tbody += '</tr>';
      }
    }
  }

The observation record that is returned by a call to ``getObservationRecord`` (or ``getFilteredObservationRecord``) is an `Observations and Measurements`_ om:Measurement resultModel representation, as returned by SOS, with additional convenience members of ``time``, ``observedPropertyTitle`` and ``uomTitle``.  It has the following structure::

  {
    samplingTime: {
      timeInstant: {
        timePosition: "2013-08-25T00:00:00.000Z"
      }
    },
    procedure: "urn:ogc:object:feature:Sensor:BAS:bas-met-halley-met",
    observedProperty: "urn:ogc:def:phenomenon:OGC:1.0.30:air_temperature",
    fois: [{
      features: [{
        layer: null,
        lonlat: null,
        data: {
          id: "foi_34579",
          name: "Halley"
        },
        id: "OpenLayers.Feature.Vector_1570",
        geometry: {
          id: "OpenLayers.Geometry.Point_1569",
          x: -26.7,
          y: -75.58
        },
        state: null,
        attributes: {
          id: "foi_34579",
          name: "Halley"
        },
        style: null
      }]
    }],
    result: {
      value: "-40.3",
      uom: "Cel"
    },
    time: "2013-08-25T00:00:00.000Z",
    observedPropertyTitle: "Air Temperature",
    uomTitle: "&deg;C"
  }
  
  
.. rubric:: Footnotes
.. [#SOSCapabilities] The parsed capabilities document is stored as a JSON object in the SOS object as ``this.SOSCapabilities``.  The structure of this document may change in future versions of the library, so direct access is discouraged.
.. [#datetime_format] All dates and times passed to the library must be in an `ISO 8601`_ compliant format.  For example, for the 31st of August 2013, that would be ``2013-08-31`` or ``2013-08-31T00:00:00.000Z`` etc.

.. _ISO 8601: http://en.wikipedia.org/wiki/ISO_8601
.. _Observations and Measurements: http://www.opengeospatial.org/standards/om