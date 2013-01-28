/******************************************************************************
* Project: SOS
* Module:  SOS.js
* Purpose: Core library of the SOS project
* Author:  Paul M. Breen
* Date:    2012-12-12
* Id:      $Id$
******************************************************************************/

/**
 * SOS
 *
 * @fileOverview SOS Class, built on the OpenLayers SOS support
 * @name SOS
 */

/* The SOS object is built on top of OpenLayers */
if(typeof OpenLayers !== "undefined" && OpenLayers !== null) {

  /* Create the SOS namespace */
  if(typeof SOS === "undefined") {
    /* Enable internationalisation of all error messages */
    OpenLayers.Lang.setCode("en");
    OpenLayers.Util.extend(OpenLayers.Lang.en, {
      "SOSGetCapabilitiesErrorMessage": "SOS Get Capabilities failed: ",
      "SOSGetLatestObservationsErrorMessage": "SOS Get Latest Observations failed: ",
      "SOSGetObservationsErrorMessage": "SOS Get Observations failed: ",
    });

    /* This library uses a proxy host.  Change the path accordingly */
    OpenLayers.ProxyHost = "/cgi-bin/proxy.cgi?url=";

    /**
     * SOS Class
     */
    var SOS = OpenLayers.Class({
      url: null,
      events: new OpenLayers.Events(this),
      capsFormatter: new OpenLayers.Format.SOSCapabilities(),
      obsFormatter: new OpenLayers.Format.SOSGetObservation(),
      config: {
        /* N.B.: Our SOS instance (52n) fails unless version is 1.0.0 */
        version: "1.0.0",
        async: true,
        observation: {
          responseFormatType: "text/xml",
          responseFormat: "text/xml;subtype=\"om/1.0.0\"",
          eventTimeLatest: "latest",
          eventTimeFirst: "first",
          resultModel: "om:Measurement",
          responseMode: "inline",
          forceSort: true,
        },
      },
      CLASS_NAME: "SOS",

      /**
       * Constructor for a SOS object
       *
       * @constructor
       */
      initialize: function(options) {
        OpenLayers.Util.extend(this, options);
      },

      /**
       * Destructor for a SOS object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Copy mandatory properties from 'this' to the given object
       */
      copyMandatoryObjectProperties: function(obj) {
        if(typeof obj === "object") {
          obj.config = this.config;
          obj.url = this.url;
        }

        return obj;
      },

      /**
       * Register a user-supplied function as an event handler
       */
      registerUserCallback: function(params) {
        if(SOS.Utils.isValidObject(params)) {
          if(typeof params.event === "string" && typeof params.callback === "function") {
            if(!SOS.Utils.isValidObject(params.scope)) {
              params.scope = this;
            }
            this.events.register(params.event, params.scope, params.callback);
          }
        }
      },

      /**
       * Unregister a previously assigned event handler
       */
      unregisterUserCallback: function(params) {
        if(SOS.Utils.isValidObject(params)) {
          if(typeof params.event === "string" && typeof params.callback === "function") {
            if(!SOS.Utils.isValidObject(params.scope)) {
              params.scope = this;
            }
            this.events.unregister(params.event, params.scope, params.callback);
          }
        }
      },

      /**
       * Request the capabilities document from the SOS
       */
      getCapabilities: function(callback) {
        var params = {"service": "SOS", "request": "GetCapabilities", "AcceptVersions": this.config.version};
        var paramString = OpenLayers.Util.getParameterString(params);
        var url = OpenLayers.Util.urlAppend(this.url, paramString);

        // Optionally the caller can register a callback for the caps request
        if(arguments.length > 0) {
          this.registerUserCallback({event: "capsavailable", scope: this, callback: callback});
        }

        OpenLayers.Request.GET({
          url: url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("SOSGetCapabilitiesErrorMessage") + url);
          },
          success: this._parseCapabilities,
        });
      },

      /**
       * Parse the capabilities document of the SOS & notify any listeners
       */
      _parseCapabilities: function(response) {
        this.SOSCapabilities = this.capsFormatter.read(response.responseXML || response.responseText);
        this.setObservationResponseFormatFromTypeSuggestion(this.config.observation.responseFormatType);
        this.events.triggerEvent("capsavailable", {response: response});
      },

      /**
       * Validate the internal capabilities object
       */
      haveValidCapabilitiesObject: function() {
        return SOS.Utils.isValidObject(this.SOSCapabilities);
      },

      /**
       * Set the config.observation.responseFormat member to an available
       * format of the given type, parsed from the capabilities object
       */
      setObservationResponseFormatFromTypeSuggestion: function(type) {
        if(this.haveValidCapabilitiesObject()) {
          for(var format in this.SOSCapabilities.operationsMetadata.GetObservation.parameters.responseFormat.allowedValues) {
            if(format.indexOf(type) >= 0) {
              this.config.observation.responseFormat = format;
              break;
            }
          }
        }
      },

      /**
       * Get the (raw) offering list
       */
      getOfferingList: function() {
        return (this.haveValidCapabilitiesObject() ? this.SOSCapabilities.contents.offeringList : null);
      },

      /**
       * Get the offering IDs
       */
      getOfferingIds: function() {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var id in this.SOSCapabilities.contents.offeringList) {
            result.push(id);
          }
        }

        return result;
      },

      /**
       * Get the offering names
       */
      getOfferingNames: function() {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var id in this.SOSCapabilities.contents.offeringList) {
            result.push(this.SOSCapabilities.contents.offeringList[id].name);
          }
        }

        return result;
      },

      /**
       * Get an SOS.Offering object given an offering ID
       */
      getOffering: function(id) {
        var offering;

        if(this.haveValidCapabilitiesObject()) {
          var o = this.SOSCapabilities.contents.offeringList[id];

          if(SOS.Utils.isValidObject(o)) {
            o.id = id;
            this.copyMandatoryObjectProperties(o);
            offering = new SOS.Offering(o);
          }
        }

        return offering;
      },

      /**
       * Get the feature-of-interest (FOI) IDs
       */
      getFeatureOfInterestIds: function() {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var id in this.SOSCapabilities.contents.offeringList) {
            var offering = this.SOSCapabilities.contents.offeringList[id];
            result = result.concat(offering.featureOfInterestIds);
          }
          result = SOS.Utils.getUniqueList(result);
        }

        return result;
      },

      /**
       * Get a list of SOS.Offering objects that include the given FOI
       */
      getOfferingsForFeatureOfInterestId: function(foiId) {
        var result = [];

        if(this.haveValidCapabilitiesObject()) {
          for(var offId in this.SOSCapabilities.contents.offeringList) {
            var o = this.SOSCapabilities.contents.offeringList[offId];

            if(OpenLayers.Util.indexOf(o.featureOfInterestIds, foiId) > -1) {
              o.id = offId;
              this.copyMandatoryObjectProperties(o);
              result.push(new SOS.Offering(o));
            }
          }
        }

        return result;
      },

      /**
       * Get the latest observations for a given FOI
       */
      getLatestObservationsForFeatureOfInterestId: function(foiId) {
        if(this.haveValidCapabilitiesObject()) {
          // If foiId is set, then it's sent in latest obs request
          this.foiId = foiId;
          var offerings = this.getOfferingsForFeatureOfInterestId(foiId);

          // Get obs for any offerings that have the given FOI
          for(var i = 0, len = offerings.length; i < len; i++) {
            this.getLatestObservationsForOffering(offerings[i]);
          }
        }
      },

      /**
       * Get the latest observations for a given SOS.Offering object
       */
      getLatestObservationsForOffering: function(offering) {
        /* Build the request document.  Only offering, observedProperties,
           and responseFormat are mandatory */
        var params = {
          eventTime: this.config.observation.eventTimeLatest,
          resultModel: this.config.observation.resultModel,
          responseMode: this.config.observation.responseMode,
          responseFormat: this.config.observation.responseFormat,
          offering: offering.id,
          observedProperties: offering.observedProperties,
        };
        if(this.foiId) {
          params.foi = {objectId: this.foiId};
        }
        var xml = this.obsFormatter.write(params);
        OpenLayers.Request.POST({
          url: this.url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("SOSGetLatestObservationsErrorMessage") + url);
          },
          success: this._parseLatestObservations,
          data: xml,
        });
      },

      /**
       * Parse the latest observations result & notify any listeners
       */
      _parseLatestObservations: function(response) {
        this.SOSObservations = this.obsFormatter.read(response.responseXML || response.responseText);
        // Result is unsorted so we can optionally ensure a default sort order
        if(this.config.observation.forceSort) {
          this.SOSObservations.measurements.sort(this._sortObservations);
        }
        this.events.triggerEvent("latestobsavailable", {response: response});
      },

      /**
       * Sort the observations result on samplingTime ascending
       */
      _sortObservations: function(a, b) {
        var ret = 0;

        if(a.samplingTime.timeInstant.timePosition < b.samplingTime.timeInstant.timePosition) {
          ret = -1;
        } else if(a.samplingTime.timeInstant.timePosition > b.samplingTime.timeInstant.timePosition) {
          ret = 1;
        }

        return ret;
      },

      /**
       * Construct a GML time period given start and end datetimes
       */
      constructGmlTimeperiod: function(start, end) {
        // We slightly increase the time interval to make it inclusive
        var t = SOS.Utils.isoToTimeInterval(start, end);
        t = SOS.Utils.adjustTimeInterval(t, -1, 1);

        /* N.B.: The "inclusive" attribute isn't implemented in the 52n SOS so
                 this is an open interval, in the strict mathematical sense.
                 Hence the need to broaden the given time interval, above */
        var s = "<eventTime>" +
                  "<ogc:TM_During>" +
                    "<ogc:PropertyName>om:samplingTime</ogc:PropertyName>" +
                    "<gml:TimePeriod>" +
                      "<gml:beginPosition>" + t.start.toISOString() + "</gml:beginPosition>" +
                      "<gml:endPosition>" + t.end.toISOString() + "</gml:endPosition>" +
                    "</gml:TimePeriod>" +
                  "</ogc:TM_During>" +
                "</eventTime>";

        return s;
      },

      /**
       * Insert a GML time period into the given request for the given start
       * and end datetimes
       */
      insertGmlTimeperiodInRequest: function(xml, start, end) {
        var timeperiodXml = this.constructGmlTimeperiod(start, end);
        xml = xml.replace("xmlns:ogc=\"http://www.opengis.net/ogc\"", "xmlns:ogc=\"http://www.opengis.net/ogc\" xmlns:gml=\"http://www.opengis.net/gml\"");
        xml = xml.replace("<eventTime/>", timeperiodXml);

        return xml;
      },

      /**
       * Get requested observations for a given SOS.Offering object
       * between given start and end datetimes
       */
      getObservationsForOffering: function(offering, start, end) {
        /* Build the request document.  Note that the GML time period is
           missing in the OL formatter, so we have to insert it */
        var params = {
          eventTime: this.config.observation.eventTimeFirst,
          resultModel: this.config.observation.resultModel,
          responseMode: this.config.observation.responseMode,
          responseFormat: this.config.observation.responseFormat,
          offering: offering.id,
          observedProperties: offering.observedProperties,
        };
        if(this.foiId) {
          params.foi = {objectId: this.foiId};
        }
        var xml = this.obsFormatter.write(params);
        xml = this.insertGmlTimeperiodInRequest(xml, start, end);
        OpenLayers.Request.POST({
          url: this.url,
          scope: this,
          async: this.config.async,
          failure: function() {
            alert(OpenLayers.i18n("SOSGetObservationsErrorMessage") + url);
          },
          success: this._parseObservations,
          data: xml,
        });
      },

      /**
       * Parse the observations result & notify any listeners
       */
      _parseObservations: function(response) {
        this.SOSObservations = this.obsFormatter.read(response.responseXML || response.responseText);
        // Result is unsorted so we can optionally ensure a default sort order
        if(this.config.observation.forceSort) {
          this.SOSObservations.measurements.sort(this._sortObservations);
        }
        this.events.triggerEvent("obsavailable", {response: response});
      },

      /**
       * Validate the internal observations object
       */
      haveValidObservationsObject: function() {
        return SOS.Utils.isValidObject(this.SOSObservations);
      },

      /**
       * Get a count of the number of records contained in the internal
       * observations object
       */
      getCountOfObservations: function() {
        var n = 0;

        if(this.haveValidObservationsObject()) {
          if(SOS.Utils.isValidObject(this.SOSObservations.measurements)) {
            n = this.SOSObservations.measurements.length;
          }
        }

        return n;
      },

      /**
       * Get the observation for the given index from the internal
       * observations object
       */
      getObservationRecord: function(i) {
        var record = {};

        if(this.haveValidObservationsObject()) {
          record = this.SOSObservations.measurements[i];

          // Some convenience properties
          record.time = record.samplingTime.timeInstant.timePosition;
          record.observedPropertyTitle = SOS.Utils.toTitleCase(SOS.Utils.toDisplayName(SOS.Utils.urnToName(record.observedProperty)));
          record.UomTitle = SOS.Utils.toDisplayUom(record.result.uom);
        }

        return record;
      },
    });

    /**
     * SOS.Offering Class
     *
     * Inherits from:
     *  - <SOS>
     */
    SOS.Offering = OpenLayers.Class(SOS, {
      CLASS_NAME: "SOS.Offering",

      /**
       * Constructor for a SOS.Offering object
       *
       * @constructor
       */
      initialize: function(options) {
        OpenLayers.Util.extend(this, options);
      },

      /**
       * Destructor for a SOS.Offering object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Get the feature-of-interest (FOI) IDs
       */
      getFeatureOfInterestIds: function() {
        return SOS.Utils.getUniqueList(this.featureOfInterestIds);
      },

      /**
       * Get the procedure IDs
       */
      getProcedureIds: function() {
        return SOS.Utils.getUniqueList(this.procedures);
      },

      /**
       * Get the observed property IDs
       */
      getObservedPropertyIds: function() {
        return SOS.Utils.getUniqueList(this.observedProperties);
      },

      /**
       * Get the observed property Names
       */
      getObservedPropertyNames: function() {
        return SOS.Utils.urnToName(SOS.Utils.getUniqueList(this.observedProperties));
      },

      /**
       * Filter this offering's observed properties list via URNs or names
       */
      filterObservedProperties: function(list) {
        if(!SOS.Utils.isArray(list)) {
          list = [list];
        }
        /* list can be URNs or names.  Ensure we have URNs only.  If we've
           already filtered, we must use the stored original list of URNs */
        var masterList = (SOS.Utils.isValidObject(this.observedPropertiesOriginal) ? this.observedPropertiesOriginal : this.observedProperties);
        var urns = SOS.Utils.lookupUrnFromName(list, masterList);

        // Store original list of observed properties so it can be restored
        if(!SOS.Utils.isValidObject(this.observedPropertiesOriginal)) {
          this.observedPropertiesOriginal = this.observedProperties;
        }
        this.observedProperties = urns;
      },

      /**
       * Reset this offering's observed properties list to an unfiltered state
       */
      unfilterObservedProperties: function() {
        if(SOS.Utils.isValidObject(this.observedPropertiesOriginal)) {
          this.observedProperties = this.observedPropertiesOriginal;
          delete this.observedPropertiesOriginal;
        }
      },

      /**
       * Get latest observations for observed properties of this offering
       */
      getLatestObservations: function(callback) {
        // Optionally the caller can register a callback for the obs request
        if(arguments.length > 0) {
          this.registerUserCallback({event: "latestobsavailable", scope: this, callback: callback});
        }

        // Inherited from SOS parent class
        this.getLatestObservationsForOffering(this);
      },

      /**
       * Get observations for observed properties of this offering between the
       * given start and end datetimes
       */
      getObservations: function(start, end, callback) {
        // Optionally the caller can register a callback for the obs request
        if(arguments.length > 2) {
          this.registerUserCallback({event: "obsavailable", scope: this, callback: callback});
        }

        // Inherited from SOS parent class
        this.getObservationsForOffering(this, start, end);
      },
    });

    /**
     * SOS.Utils namespace.  Utility functions for SOS classes
     */
    SOS.Utils = {
      uomDisplayTitles: {
        "Cel": "&deg;C",
        "m/s": "m s<sup>-1</sup>",
      },

      isValidObject: function(x) {
        return (typeof x !== "undefined" && x !== null);
      },

      isArray: function(x) {
        return (Object.prototype.toString.call(x) === "[object Array]");
      },

      isNumber: function(x) {
        return (!isNaN(parseFloat(x)) && isFinite(x));
      },

      getUniqueList: function(x) {
        var a = [];

        for(var i = 0, len = x.length; i < len; i++) {
          if(OpenLayers.Util.indexOf(a, x[i]) === -1) {
            a.push(x[i]);
          }
        }

        return a;
      },

      toTitleCase: function(x) {
        var y = x;

        if(typeof x == "string") {
          var a = x.split(/ /);

          for(var j = 0, len = a.length; j < len; j++) {
            a[j] = a[j].replace(/^(.)/, function(match, $1, offset, original) {return ($1).toUpperCase();});
          }
          y = a.join(" ");
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.toTitleCase(x[i]));
          }
        }

        return y;
      },

      toDisplayName: function(x) {
        var y = x;

        if(typeof x == "string") {
          y = x.replace(/_/g, " ");
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.toDisplayName(x[i]));
          }
        }

        return y;
      },

      urnToName: function(x) {
        var y = x;

        if(typeof x == "string") {
          y = x.replace(/^.*:/, "");
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.urnToName(x[i]));
          }
        }

        return y;
      },

      lookupUrnFromName: function(x, a) {
        var y = x;

        if(typeof x == "string") {
          for(var i = 0, len = a.length; i < len; i++) {
            if(this.urnToName(a[i]) === x) {
              y = a[i];
              break;
            }
          }
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.lookupUrnFromName(x[i], a));
          }
        }

        return y;
      },

      toDisplayUom: function(x) {
        var y = x;

        /* SOS units are encoded according to Unified Code for Units of Measure
           (UCUM).  See http://unitsofmeasure.org/ */
        if(this.isValidObject(this.uomDisplayTitles)) {
          if(typeof x == "string") {
            if(this.uomDisplayTitles[x]) {
              y = this.uomDisplayTitles[x];
            }
          } else if(this.isArray(x)) {
            y = [];

            for(var i = 0, len = x.length; i < len; i++) {
              y.push(this.toDisplayUom(x[i]));
            }
          }
        }

        return y;
      },

      isoToDateObject: function(x) {
        var y = x;

        // Example datetime string: 2012-01-01T01:00:00.000Z (or date only)
        if(typeof x == "string") {
          var a = x.split(/T/);
          if(a.length < 2) {a[1] = "00:00:00.000Z";}
          var d = a[0].split(/-/);
          a[1] = a[1].replace(/Z$/, "");
          var t = a[1].split(/:/);
          var ms = t[2].replace(/^\d+\./, "");
          t[2] = t[2].replace(/\.\d+$/, "");

          y = new Date(parseInt(d[0], 10),
                       parseInt(d[1]-1, 10),
                       parseInt(d[2], 10),
                       parseInt(t[0], 10),
                       parseInt(t[1], 10),
                       parseInt(t[2], 10),
                       parseInt(ms, 10));
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.isoToDateObject(x[i]));
          }
        }

        return y;
      },

      isoToJsTimestamp: function(x) {
        var y = x;

        if(typeof x == "string") {
          var D = this.isoToDateObject(x);
          y = D.getTime();
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.isoToJsTimestamp(x[i]));
          }
        }

        return y;
      },

      jsTimestampToIso: function(x) {
        var y = x;

        if(typeof x == "string" || typeof x == "number") {
          var D = new Date(x);
          y = D.toISOString();
        } else if(this.isArray(x)) {
          y = [];

          for(var i = 0, len = x.length; i < len; i++) {
            y.push(this.jsTimestampToIso(x[i]));
          }
        }

        return y;
      },

      isoToTimeInterval: function(start, end) {
        var t = {start: null, end: null};

        t.start = this.isoToDateObject(start);
        t.end = this.isoToDateObject(end);

        return t;
      },

      adjustTimeInterval: function(t, startOffset, endOffset) {
        t.start.setTime(t.start.getTime() + startOffset);
        t.end.setTime(t.end.getTime() + endOffset);

        return t;
      },

      parseRelativeTime: function(x) {
        var t = {start: null, end: null};
        var local = new Date();
        var T = local.getTime();
        var s = x;
        var u = 0, c = 0, d = 0;

        // N.B.: We get local time but always use the getUTC* methods

        t.start = new Date(T);
        t.end = new Date(T);

        // For convenience we accept today, yesterday, current*, & previous*
        s = s.replace(/to|current/i, "this");
        s = s.replace(/yester|previous/i, "last");

        if((/hour$/i).test(s)) {
          u = 60 * 60 * 1000;
          c = T % u;
        }
        if((/day$/i).test(s)) {
          u = 24 * 60 * 60 * 1000;
          c = T % u;
        }
        if((/week$/i).test(s)) {
          d = 24 * 60 * 60 * 1000;
          u = 7 * 24 * 60 * 60 * 1000;
          c = local.getUTCDay() * d + T % d;
        }
        if((/month$/i).test(s)) {
          d = 24 * 60 * 60 * 1000;
          u = 31 * 24 * 60 * 60 * 1000;
          c = (local.getUTCDate() - 1) * d + T % d;
        }
        if((/year$/i).test(s)) {
          d = 24 * 60 * 60 * 1000;
          u = 366 * 24 * 60 * 60 * 1000;
          c = (local.getUTCDayOfYear() - 1) * d + T % d;
        }

        if((/^this/i).test(s)) {
          this.adjustTimeInterval(t, - c, - c + u - 1);
        }
        if((/^last/i).test(s)) {
          this.adjustTimeInterval(t, - c - u, - c - 1);
        }
        if((/^rolling/i).test(s)) {
          this.adjustTimeInterval(t, - u, - 1);
        }

        return t;
      },

      extractColumn: function(x, n) {
        var y = [];

        if(this.isArray(x)) {
          for(var i = 0, len = x.length; i < len; i++) {
            y.push(x[i][n]);
          }
        }

        return y;
      },

      sum: function(x) {
        var y = 0;

        for(var i = 0, len = x.length; i < len; i++) {
          y += parseFloat(x[i]);
        }

        return y;
      },

      computeStats: function(x) {
        var y = {N: 0, sum: 0, min: 0, max: 0, mean: 0, median: 0, q1: 0, q3: 0, variance: 0, sd: 0};

        if(this.isArray(x) && x.length > 1) {
          y.N = x.length;
          y.sum = this.sum(x);
          y.mean = y.sum / y.N;
          y.min = Math.min.apply(null, x);
          y.max = Math.max.apply(null, x);

          // We must copy x as sort() sorts in-place
          var sorted = x.slice(0);
          sorted.sort(function(a, b) {return a - b;});

          var floor = Math.floor(y.N / 2);
          y.median = ((y.N % 2) == 0) ? this.sum(sorted.slice(floor, floor + 2)) / 2 : sorted[floor + 1];
          floor = Math.floor(y.N / 4);
          y.q1 = ((y.N % 2) == 0) ? this.sum(sorted.slice(floor, floor + 2)) / 2 : sorted[floor + 1];
          floor *= 3;
          y.q3 = ((y.N % 2) == 0) ? this.sum(sorted.slice(floor, floor + 2)) / 2 : sorted[floor + 1];

          var t = 0;

          for(var i = 0, len = x.length; i < len; i++) {
            t += Math.pow(x[i] - y.mean, 2);
          }
          y.variance = t / (y.N - 1);
          y.sd = Math.sqrt(y.variance);
        }

        return y;
      },

      computeHistogram: function(x) {
        var y = {min: 0, max: 0, lower: 0, upper: 0, nBins: 0, binWidth: 0, data: []};

        if(this.isArray(x) && x.length > 1) {
          var j = 0;
          var sorted = x.slice(0);
          sorted.sort(function(a, b) {return a - b;});
          y.min = Math.min.apply(null, sorted);
          y.max = Math.max.apply(null, sorted);
          y.lower = Math.floor(y.min);
          y.upper = Math.ceil(y.max);
          y.nBins = 10;

          if((y.upper - y.lower) > 0) {
            y.binWidth = Math.pow(10, Math.round(Math.log(y.upper - y.lower) / Math.log(10))) / y.nBins;

            for(var i = y.lower; i < y.upper; i += y.binWidth) {
              var bin = [i, 0];
              for(var len = sorted.length; j < len; j++) {
                if(sorted[j] < i + y.binWidth) {
                  bin[1]++;
                } else {
                  break;
                }
              }
              y.data.push(bin);
            }
          }
        }

        return y;
      },
    };

    /**************************************************************************
     * Overrides, bug fixes, JS engine compatibility fixups etc.
     *
     * Arbitrary code that's not strictly part of the SOS library, but
     * nonetheless required by it
     *************************************************************************/
    if(!Date.prototype.toISOString) {
      (function() {
        function pad(number) {
          var r = String(number);
          if(r.length === 1) {
            r = '0' + r;
          }
          return r;
        }
        Date.prototype.toISOString = function() {
          return this.getUTCFullYear()
            + '-' + pad(this.getUTCMonth() + 1)
            + '-' + pad(this.getUTCDate())
            + 'T' + pad(this.getUTCHours())
            + ':' + pad(this.getUTCMinutes())
            + ':' + pad(this.getUTCSeconds())
            + '.' + String((this.getUTCMilliseconds()/1000).toFixed(3)).slice(2, 5)
            + 'Z';
        };
      }());
    }
    if(!Date.prototype.getUTCDayOfYear) {
      (function() {
        Date.prototype.getUTCDayOfYear = function() {
          var d = new Date(this.getUTCFullYear(), 0, 1);

          return Math.ceil((this.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
        };
      }());
    }
  }
}

