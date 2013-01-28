/******************************************************************************
* Project: SOS
* Module:  SOS.Ui.js
* Purpose: User Interface library of the SOS project
* Author:  Paul M. Breen
* Date:    2012-12-12
* Id:      $Id$
******************************************************************************/

/**
 * SOS.Ui
 *
 * @fileOverview SOS.Ui Classes, built on the SOS Class (which in turn is
 * built on the OpenLayers SOS support).  Additionally, SOS.Plot is also
 * built on the jquery.flot plotting library
 * @name SOS.Ui
 */

/* The SOS.Ui objects are built on top of SOS, OL & jquery.flot */
if(typeof OpenLayers !== "undefined" && OpenLayers !== null &&
   typeof SOS !== "undefined" && SOS !== null &&
   typeof jQuery !== "undefined" && jQuery !== null &&
   typeof jQuery.plot !== "undefined" && jQuery.plot !== null) {
  /* Enable internationalisation of all strings */
  OpenLayers.Lang.setCode("en");
  OpenLayers.Util.extend(OpenLayers.Lang.en, {
    "SOSObservedPropertyString": "Observed Property",
    "SOSTimeString": "Time",
    "SOSValueString": "Value"
  });

  /* Create the SOS.Ui namespace */
  if(typeof SOS.Ui === "undefined") {
    /**
     * SOS.Ui Class
     * Base class for SOS User Interface objects.  This class marshalls access
     * to underlying SOS core objects, such as SOS, SOS.Offering etc.
     */
    SOS.Ui = OpenLayers.Class({
      url: null,
      sos: null,
      offering: null,
      CLASS_NAME: "SOS.Ui",

      /**
       * Constructor for a SOS.Ui object
       *
       * @constructor
       */
      initialize: function(options) {
        jQuery.extend(true, this, options);
      },

      /**
       * Destructor for a SOS.Ui object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Set the internal SOS object
       */
      setSos: function(obj) {
        if(obj instanceof SOS) {
          this.sos = obj;
        }
      },

      /**
       * Get the internal SOS object
       */
      getSos: function() {
        if(!this.haveValidSosObject()) {
          if(SOS.Utils.isValidObject(this.url)) {
            this.sos = new SOS({url: this.url});
          }
        }

        return this.sos;
      },

      /**
       * Validate the internal SOS object
       */
      haveValidSosObject: function() {
        return SOS.Utils.isValidObject(this.sos);
      },

      /**
       * Get the internal sos.SOSCapabilities object
       */
      getCapabilities: function(callback) {
        if(!this.haveValidSosObject()) {
          this.getSos();
        }

        if(this.haveValidSosObject()) {
          if(!this.sos.haveValidCapabilitiesObject()) {
            // Optionally the caller can register a callback for caps request
            if(arguments.length > 0) {
              this.sos.registerUserCallback({event: "capsavailable", scope: this, callback: callback});
            }
            this.sos.getCapabilities();
          }
        }
      },

      /**
       * Validate the internal sos.SOSCapabilities object
       */
      haveValidCapabilitiesObject: function() {
        return (this.haveValidSosObject() && this.sos.haveValidCapabilitiesObject());
      },

      /**
       * Set the internal SOS.Offering object
       */
      setOffering: function(obj) {
        if(obj instanceof SOS.Offering) {
          this.offering = obj;
        }
      },

      /**
       * Get the internal SOS.Offering object
       */
      getOffering: function() {
        if(!this.haveValidCapabilitiesObject()) {
          this.getCapabilities(this._getOffering);
        } else {
          this._getOffering();
        }

        return this.offering;
      },

      /**
       * Store the internal SOS.Offering object from a call to
       * sos.getOffering()
       */
      _getOffering: function() {
        if(SOS.Utils.isValidObject(this.offeringId)) {
          this.offering = this.sos.getOffering(this.offeringId);
        }
      },

      /**
       * Validate the internal SOS.Offering object
       */
      haveValidOfferingObject: function() {
        return SOS.Utils.isValidObject(this.offering);
      },

      /**
       * Determine the time parameters for performing a getObservation request
       */
      determineObservationQueryTimeParameters: function() {
        if(!(SOS.Utils.isValidObject(this.startDatetime) && SOS.Utils.isValidObject(this.endDatetime))) {
          var relativeTime = this.relativeTime || "today";
          var t = SOS.Utils.parseRelativeTime(relativeTime);
          this.startDatetime = t.start.toISOString();
          this.endDatetime = t.end.toISOString();
        }
      },

      /**
       * Get data from given SOS query result object & return as a table
       * suitable for displaying
       */
      constructDataTable: function(res) {
        var table = {label: "", name: "", uom: "", data: []};

        // Construct the data table
        for(var i = 0, len = res.getCountOfObservations(); i < len; i++) {
          var ob = res.getObservationRecord(i);

          if(table.name.length < 1) {
            table.name = ob.observedPropertyTitle;
          }
          if(table.uom.length < 1) {
            table.uom = ob.UomTitle;
          }
          table.data.push([SOS.Utils.isoToJsTimestamp(ob.time), ob.result.value]);
        }

        if(res.name) {
          table.label = res.name;
        } else if(res.id) {
          table.label = res.id;
        } else {
          table.label = table.name;
          table.label += (table.uom.length > 0 ? " / " + table.uom : "");
        }

        return table;
      },

      /**
       * Subset an existing data series
       */
      subsetDataSeries: function(series, from, to) {
        var subset = [], n = 0;

        for(var i = 0, slen = series.length; i < slen; i++) {
          subset[i] = {label: "", name: "", uom: "", data: []};
          n = 0;

          // Copy all metadata
          for(var key in {label: "", name: "", uom: ""}) {
            subset[i][key] = series[i][key];
          }

          // Only select data whose datetime lie on the given closed interval
          for(var j = 0, tlen = series[i].data.length; j < tlen; j++) {
            if(series[i].data[j][0] >= from && series[i].data[j][0] <= to) {
              subset[i].data[n] = [];

              for(var k = 0, dlen = series[i].data[j].length; k < dlen; k++) {
                subset[i].data[n][k] = series[i].data[j][k];
              }
              n++;
            }
          }
        }

        return subset;
      },

      /**
       * Format the given value for display (simple)
       */
      formatValueSimple: function(v, L, N) {
        var x = parseFloat(v);
        return (Math.abs(x) < L && x != 0 ? x.toExponential(N) : x.toFixed(N));
      },

      /**
       * Format the given value for display (fancy)
       */
      formatValueFancy: function(v, L, N) {
        var x = parseFloat(v);

        if(Math.abs(x) < L && x != 0) {
          x = x.toExponential(N);
          x = x.replace(/e(.+)/, function(match, $1, offset, original) {return (" x 10 <sup>" + $1 + "</sup>");});
        } else {
          x = x.toFixed(N);
        }

        return x;
      },

      /**
       * Display summary stats about the given selected observation data
       */
      displaySelectedIntervalStats: function(container, selected) {
        var series = selected[0].item.series;
        var start = Math.min(selected[0].item.dataIndex, selected[1].item.dataIndex);
        var end = Math.max(selected[0].item.dataIndex, selected[1].item.dataIndex);
        var subset = series.data.slice(start, end + 1);
        var values = SOS.Utils.extractColumn(subset, 1);
        var stats = SOS.Utils.computeStats(values);
        var hist = SOS.Utils.computeHistogram(values);

        var panel = jQuery('<div/>');
        this.addSelectedIntervalStatsContent(panel, selected, stats, hist);
        container.after(panel);

        var buttons = [
          {text: "Close", click: function() {jQuery(this).dialog("close");}}
        ];

        var dialog = panel.dialog({position: ['center', 'center'], buttons: buttons, title: series.label, width: 540, zIndex: 1010, stack: false});
        dialog.bind('dialogclose', function() {jQuery(this).dialog("destroy");});
      },

      /**
       * Add summary stats content to dialog
       */
      addSelectedIntervalStatsContent: function(panel, selected, stats, hist) {
        var series = selected[0].item.series;
        var st = jQuery('<div id="sosSelectedIntervalStatsTable" class="sos-selected-interval-stats-table"/>');
        var sp = jQuery('<div id="sosSelectedIntervalStatsPlot" class="sos-selected-interval-stats-plot" style="width: 300px; height: 150px;"/>');
        var fv = this.config.format.value;
        var tcontent = "";

        /* N.B.: It's crucial that any flot plot has width & height set.  The
                 above somewhat redundant style for the plot div is required
                 because IE & chrome don't see the CSS class definition before
                 the plot is generated, causing an uncaught exception */

        // Construct stats table
        for(var key in {min: 0, max: 0, mean: 0, median: 0, q1: 0, q3: 0, variance: 0, sd: 0}) {
          tcontent += '<tr>';
          tcontent += '<td class="sos-control-title">' + key + '</td>';
          tcontent += '<td> = ' + fv.formatter(parseFloat(stats[key]), fv.sciLimit, fv.digits) + '</td>';
          tcontent += '</tr>';
        }

        var table = '<table><tbody>';
        table += tcontent;
        table += '</tbody></table>';
        st.append(table);

        panel.append('<span class="sos-control-title">' + series.name + ' / ' + series.uom + '</span>', '<hr></hr>');
        panel.append(st, sp);

        // Generate stats plot
        this.config.stats = this.config.stats || {};
        this.config.stats.series = [{data: hist.data}];
        this.config.stats.options = {
          grid: {borderWidth: 1},
          series: {
            color: series.color,
            bars: {
              show: true,
              barWidth: hist.binWidth
            }
          }
        };
        this.config.stats.object = jQuery.plot(sp, this.config.stats.series, this.config.stats.options);
      }
    });
  }

  /* Create the SOS.Plot namespace */
  if(typeof SOS.Plot === "undefined") {
    /**
     * SOS.Plot Class
     * Class for displaying a plot of data served from a SOS
     *
     * Inherits from:
     *  - <SOS.Ui>
     */
    SOS.Plot = OpenLayers.Class(SOS.Ui, {
      url: null,
      sos: null,
      offering: null,
      offeringId: null,
      observedProperty: null,
      startDatetime: null,
      endDatetime: null,
      relativeTime: "today",
      config: {
        plot: {
          object: null,
          id: "sosPlot",
          series: [],
          options: {
            xaxis: {mode: "time", axisLabel: "Time"},
            yaxis: {},
            selection: {mode: "x"},
            grid: {borderWidth: 1, hoverable: true, clickable: true},
            legend: {show: true, backgroundOpacity: 0.5},
            series: {lines: {show: true}, points: {show: false}}
          }
        },
        overview: {
          object: null,
          id: "sosPlotOverview",
          series: [],
          options: {
            show: false,
            xaxis: {ticks: [], mode: "time"},
            yaxis: {ticks: [], autoscaleMargin: 0.1},
            selection: {mode: "x"},
            grid: {borderWidth: 1},
            legend: {show: false},
            series: {lines: {show: true, lineWidth: 1}, shadowSize: 0}
          }
        },
        format: {
          time: {
            formatter: SOS.Utils.jsTimestampToIso
          },
          value: {
            sciLimit: 0.1,
            digits: 2,
            formatter: SOS.Ui.prototype.formatValueFancy
          }
        }
      },
      CLASS_NAME: "SOS.Plot",

      /**
       * Constructor for a SOS.Plot object
       *
       * @constructor
       */
      initialize: function(options) {
        jQuery.extend(true, this, options);
      },

      /**
       * Destructor for a SOS.Plot object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Set options for the plot
       */
      setPlotOptions: function(options) {
        jQuery.extend(true, this.config.plot.options, options);
      },

      /**
       * Set options for the plot overview
       */
      setOverviewOptions: function(options) {
        jQuery.extend(true, this.config.overview.options, options);
      },

      /**
       * Set the given axis to logarithmic
       */
      setAxisLogarithmic: function(axis, base) {
        axis = axis || "yaxis";
        base = base || 10;
        this.config.plot.options[axis].transform = function(v) {return (v != 0 ? Math.log(v) / Math.log(base) : 0);};
        this.config.plot.options[axis].inverseTransform = function(v) {return Math.pow(base, v);};
        this.config.overview.options[axis].transform = this.config.plot.options[axis].transform;
        this.config.overview.options[axis].inverseTransform = this.config.plot.options[axis].inverseTransform;
      },

      /**
       * Set the given axis to reverse order
       */
      setAxisReverse: function(axis) {
        axis = axis || "yaxis";
        this.config.plot.options[axis].transform = this.config.plot.options[axis].inverseTransform = function(v) {return -v;};
        this.config.overview.options[axis].transform = this.config.plot.options[axis].transform;
        this.config.overview.options[axis].inverseTransform = this.config.plot.options[axis].inverseTransform;
      },
 
      /**
       * Generate the plot using this object's properties to query the SOS
       */
      display: function(options) {
        // Parameters can optionally be tweaked for each call
        if(arguments.length > 0) {
          jQuery.extend(true, this, options);
        }

        if(!this.haveValidCapabilitiesObject()) {
          this.getCapabilities(this._display);
        } else {
          this._display();
        }
      },

      /**
       * Add to pending plot using given additional options to query the SOS
       */
      add: function(options) {
        // Store parameters so they can be added to a base plot
        if(arguments.length > 0) {
          this.additional = this.additional || [];
          this.additional.push(options);
        }
      },

      /**
       * Get the observation data from the SOS according to this object's
       * properties, & then draw the plot
       */
      _display: function() {
        this._getOffering();

        if(this.haveValidOfferingObject()) {
          if(SOS.Utils.isValidObject(this.observedProperty)) {
            this.offering.filterObservedProperties(this.observedProperty);
          }
          this.determineObservationQueryTimeParameters();
          this.offering.registerUserCallback({event: "obsavailable", scope: this, callback: this.draw});
          this.offering.getObservations(this.startDatetime, this.endDatetime);
        }
      },

      /**
       * Plot the given observation data
       */
      draw: function() {
        // Avoid infinite loop as addData() also listens for obsavailable
        this.offering.unregisterUserCallback({event: "obsavailable", scope: this, callback: this.draw});

        // Construct the data series
        var table = this.constructDataTable(this.offering);
        this.config.plot.series.push(table);

        // Set any last minute defaults if not already set
        this.applyDefaults();

        // Generate the plot
        this.config.plot.object = jQuery.plot(jQuery('#' + this.config.plot.id), this.config.plot.series, this.config.plot.options);

        // Optionally generate the plot overview
        if(this.config.overview.options.show) {
          this.drawOverview();
        }

        // Manage the plot's interactive behaviour
        this.setupBehaviour();

        // Now we have the base plot, plot any additional data
        if(SOS.Utils.isValidObject(this.additional)) {
          this.addData();
        }
      },

      /**
       * Apply any defaults where none have been specified or combination
       * of options is nonsensical
       */
      applyDefaults: function() {
        var options = this.config.plot.options;
        var series = this.config.plot.series;

        options.grid = options.grid || {};
        options.yaxis = options.yaxis || {};

        if(options.grid.show === false) {
          options.xaxis.axisLabel = null;
          options.yaxis.axisLabel = null;
        } else {
          if(!SOS.Utils.isValidObject(options.yaxis.axisLabel)) {
            if(series.length > 0) {
              options.yaxis.axisLabel = series[0].name;
              options.yaxis.axisLabel += (series[0].uom.length > 0 ? " / " + series[0].uom : "");
            }
          }
        }
      },

      /**
       * Plot the given observation data as an overview plot
       */
      drawOverview: function() {
        var o = jQuery('#' + this.config.overview.id);

        // If overview div doesn't exist (the norm), create one on the fly
        if(o.length < 1) {
          var p = jQuery('#' + this.config.plot.id);
          o = jQuery('<div id="sosPlotOverview" class="sos-plot-overview"/>');
          p.after(o);
        }

        this.config.overview.series = this.config.plot.series;
        this.config.overview.object = jQuery.plot(o, this.config.overview.series, this.config.overview.options);
      },

      /**
       * Setup event handlers to manage the plot's behaviour
       */
      setupBehaviour: function() {
        var p = jQuery('#' + this.config.plot.id);
        var valueBox = jQuery("#sosPlotValueBox");
        var xlimit = ((p.offset().left + p.outerWidth()) - 220);
        var ylimit = ((p.offset().top + p.outerHeight()) - 100);

        // If valueBox div doesn't exist (the norm), create one on the fly
        if(valueBox.length < 1) {
          valueBox = jQuery('<div id="sosPlotValueBox" class="sos-plot-valuebox" style="display:none"/>');
          p.after(valueBox);
        }

        // Show data coordinates (time, value) as mouse hovers over plot
        p.bind("plothover", {self: this}, function(evt, pos, item) {
          if(item) {
            var ft = evt.data.self.config.format.time;
            var fv = evt.data.self.config.format.value;
            // Ensure the value box stays within the plot boundaries.  The
            // small offsets avoid flickering when box is under mouse
            var x = Math.min(item.pageX, xlimit) + 10;
            var y = Math.min(item.pageY, ylimit) + 10;
            var html = jQuery('<p><span class="sos-control-title">Time:</span> <span>' + ft.formatter(pos.x) + '</span><br/><span class="sos-control-title">Value:</span> <span>' + fv.formatter(pos.y, fv.sciLimit, fv.digits) + ' ' + item.series.uom + '</span></p>');

            valueBox.html(html);
            valueBox.css({
              position: "absolute",
              left: x + "px",
              top: y + "px",
              borderColor: item.series.color
            });
            valueBox.show();
          }
        });

        // Clear the value box when mouse leaves plot area
        p.bind("mouseout", function() {
          valueBox.hide();
        });

        // Show summary stats of a selected interval between two points
        p.bind("plotclick", {self: this}, function(evt, pos, item) {
          var self = evt.data.self;

          if(item) {
            self.config.plot.selected = self.config.plot.selected || [];
            self.config.plot.object.highlight(item.series, item.datapoint);
            self.config.plot.selected.push({pos: pos, item: item});

            // On first selection, grey-out all other curves on the plot
            if(self.config.plot.selected.length == 1) {
              self.greyOutSeries(item.seriesIndex);
            }

            if(self.config.plot.selected.length > 1) {
              if(self.config.plot.selected[1].item.seriesIndex == self.config.plot.selected[0].item.seriesIndex) {
                self.displaySelectedIntervalStats(p, self.config.plot.selected);
              }
              // Reinstate plot, including ungreying-out all other curves
              self.config.plot.object.unhighlight();
              delete self.config.plot.selected;
              self.update();
            }
          }
        });

        // Optionally manage the plot overview behaviour
        if(this.config.overview.options.show) {
          var o = jQuery('#' + this.config.overview.id);
          var plot = this.config.plot;
          var overview = this.config.overview;

          // Connect the overview to the plot
          p.bind("plotselected", function(evt, ranges) {
            // Manage zooming
            plot.object = jQuery.plot(p, plot.series, jQuery.extend(true, {}, plot.options, {xaxis: {min: ranges.xaxis.from, max: ranges.xaxis.to}}));

            // Don't fire event on the overview to prevent eternal loop
            overview.object.setSelection(ranges, true);
          });
    
          o.bind("plotselected", function(evt, ranges) {
            plot.object.setSelection(ranges);
          });

          o.bind("plotunselected", function() {
            plot.object = jQuery.plot(p, plot.series, plot.options);
          });
        }
      },

      /**
       * Reset plot's event handlers
       */
      resetBehaviour: function() {
        var p = jQuery('#' + this.config.plot.id);
        var o = jQuery('#' + this.config.overview.id);

        if(p.length > 0) {
          p.unbind();
        }
        if(o.length > 0) {
          o.unbind();
        }
      },

      /**
       * Get the observation data from the SOS for each additional set of
       * query parameters, & then update the existing plot
       */
      addData: function() {
        if(SOS.Utils.isValidObject(this.additional)) {
          for(var i = 0, len = this.additional.length; i < len; i++) {
            jQuery.extend(true, this, this.additional[i]);
            this._getOffering();

            if(this.haveValidOfferingObject()) {
              if(SOS.Utils.isValidObject(this.observedProperty)) {
                this.offering.filterObservedProperties(this.observedProperty);
              }
              this.determineObservationQueryTimeParameters();
              this.offering.registerUserCallback({event: "obsavailable", scope: this, callback: this.drawAdditionalData});
              this.offering.getObservations(this.startDatetime, this.endDatetime);
            }
          }
        }
      },

      /**
       * Add the given observation data to an existing plot
       */
      drawAdditionalData: function() {
        // Avoid infinite loop as each additional listens for obsavailable
        this.offering.unregisterUserCallback({event: "obsavailable", scope: this, callback: this.drawAdditionalData});

        // Construct the data series
        var table = this.constructDataTable(this.offering);
        this.config.plot.series.push(table);

        this.update();

        // Optionally update the plot overview also
        if(this.config.overview.options.show) {
          this.config.overview.series = this.config.plot.series;
          this.updateOverview();
        }
      },

      /**
       * Redraw an existing plot
       */
      update: function() {
        this.config.plot.object.setData(this.config.plot.series);
        this.config.plot.object.setupGrid();
        this.config.plot.object.draw();
      },

      /**
       * Redraw an existing overview plot
       */
      updateOverview: function() {
        this.config.overview.object.setData(this.config.overview.series);
        this.config.overview.object.setupGrid();
        this.config.overview.object.draw();
      },

      /**
       * Reset an existing plot (& overview)
       */
      reset: function() {
        this.resetSeries();
        this.resetOverviewSeries();
        this.resetBehaviour();

        if(SOS.Utils.isValidObject(this.config.plot.options.yaxis.axisLabel)) {
          this.config.plot.options.yaxis.axisLabel = null;
        }
      },

      /**
       * Grey-out all except the given series on the plot.  Specifying a series
       * index of -1 will grey-out all series.  Call update() to reinstate
       * plot to original colours
       */
      greyOutSeries: function(seriesIndex) {
        var series = this.config.plot.object.getData();

        for(var i = 0, len = series.length; i < len; i++) {
          if(i != seriesIndex) {
            series[i].color = "rgb(240, 240, 240)";
          }
        }
        this.config.plot.object.setupGrid();
        this.config.plot.object.draw();
      },

      /**
       * Reset series of an existing plot
       */
      resetSeries: function() {
        this.config.plot.series = [];
      },

      /**
       * Reset series of an existing overview plot
       */
      resetOverviewSeries: function() {
        this.config.overview.series = [];
      }
    });
  }

  /* Create the SOS.Table namespace */
  if(typeof SOS.Table === "undefined") {
    /**
     * SOS.Table Class
     * Class for displaying a table of data served from a SOS
     *
     * Inherits from:
     *  - <SOS.Ui>
     */
    SOS.Table = OpenLayers.Class(SOS.Ui, {
      url: null,
      sos: null,
      offering: null,
      offeringId: null,
      observedProperty: null,
      startDatetime: null,
      endDatetime: null,
      relativeTime: "today",
      config: {
        table: {
          object: null,
          id: "sosTable",
          series: [],
          options: {
            header: {},
            scrollable: false
          }
        },
        overview: {
          object: null,
          id: "sosTableOverview",
          series: [],
          options: {
            show: false,
            xaxis: {ticks: [], mode: "time"},
            yaxis: {ticks: [], autoscaleMargin: 0.1},
            selection: {mode: "x"},
            grid: {borderWidth: 1},
            legend: {show: false},
            series: {lines: {show: true, lineWidth: 1}, shadowSize: 0}
          }
        },
        format: {
          time: {
            formatter: SOS.Utils.jsTimestampToIso
          },
          value: {
            sciLimit: 0.1,
            digits: 2,
            formatter: SOS.Ui.prototype.formatValueFancy
          }
        }
      },
      CLASS_NAME: "SOS.Table",

      /**
       * Constructor for a SOS.Table object
       *
       * @constructor
       */
      initialize: function(options) {
        jQuery.extend(true, this, options);
      },

      /**
       * Destructor for a SOS.Table object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Set options for the table
       */
      setTableOptions: function(options) {
        jQuery.extend(true, this.config.table.options, options);
      },

      /**
       * Set options for the table overview
       */
      setOverviewOptions: function(options) {
        jQuery.extend(true, this.config.overview.options, options);
      },

      /**
       * Generate the table using this object's properties to query the SOS
       */
      display: function(options) {
        // Parameters can optionally be tweaked for each call
        if(arguments.length > 0) {
          jQuery.extend(true, this, options);
        }

        if(!this.haveValidCapabilitiesObject()) {
          this.getCapabilities(this._display);
        } else {
          this._display();
        }
      },

      /**
       * Add to pending table using given additional options to query the SOS
       */
      add: function(options) {
        // Store parameters so they can be added to a base table
        if(arguments.length > 0) {
          this.additional = this.additional || [];
          this.additional.push(options);
        }
      },

      /**
       * Get the observation data from the SOS according to this object's
       * properties, & then draw the table
       */
      _display: function() {
        this._getOffering();

        if(this.haveValidOfferingObject()) {
          if(SOS.Utils.isValidObject(this.observedProperty)) {
            this.offering.filterObservedProperties(this.observedProperty);
          }
          this.determineObservationQueryTimeParameters();
          this.offering.registerUserCallback({event: "obsavailable", scope: this, callback: this.draw});
          this.offering.getObservations(this.startDatetime, this.endDatetime);
        }
      },

      /**
       * Display the given observation data
       */
      draw: function() {
        // Avoid infinite loop as addData() also listens for obsavailable
        this.offering.unregisterUserCallback({event: "obsavailable", scope: this, callback: this.draw});

        // Construct the data series
        var table = this.constructDataTable(this.offering);
        this.config.table.series.push(table);

        // Set any last minute defaults if not already set
        this.applyDefaults();

        // Generate the table
        this.config.table.object = this.generateTable(jQuery('#' + this.config.table.id), this.config.table.series, this.config.table.options);

        // Optionally generate the table overview
        if(this.config.overview.options.show) {
          this.drawOverview();
        }

        // Manage the table's interactive behaviour
        this.setupBehaviour();

        // Now we have the base table, add any additional data
        if(SOS.Utils.isValidObject(this.additional)) {
          this.addData();
        }
      },

      /**
       * Apply any defaults where none have been specified or combination
       * of options is nonsensical
       */
      applyDefaults: function() {
        var options = this.config.table.options;
        var series = this.config.table.series;

        if(!SOS.Utils.isValidObject(options.header.headerLabel)) {
          if(series.length > 0) {
            options.header.headerLabel = series[0].name;
            options.header.headerLabel += (series[0].uom.length > 0 ? " / " + series[0].uom : "");
          }
        }
      },

      /**
       * Plot the given observation data as an overview plot
       */
      drawOverview: function() {
        var o = jQuery('#' + this.config.overview.id);

        // If overview div doesn't exist (the norm), create one on the fly
        if(o.length < 1) {
          var t = jQuery('#' + this.config.table.id);
          o = jQuery('<div id="sosTableOverview" class="sos-plot-overview"/>');
          t.after(o);
        }

        this.config.overview.series = this.config.table.series;
        this.config.overview.object = jQuery.plot(o, this.config.overview.series, this.config.overview.options);
      },

      /**
       * Setup event handlers to manage the table's behaviour
       */
      setupBehaviour: function() {
        var t = jQuery('#' + this.config.table.id);

        // Setup custom events for the table
        this.setupTableEventTriggers(t, "td");

        /* Highlight datetime & value cells as mouse moves over table.  The
           selecting flag determines between drag selection or discrete click */
        t.delegate("td", "mouseover mouseout", {self: this}, function(evt) {
          evt.data.self.config.table.selecting ? evt.data.self.highlightCellGroup(this) : evt.data.self.toggleHighlightCellGroup(this);
        });
 
        // Show summary stats of a selected interval between two points
        t.bind("tableclick", {self: this}, function(evt) {
          var self = evt.data.self;
          var item = self.eventToItem(evt);
          delete self.config.table.selecting;

          if(item) {
            self.config.table.selected = self.config.table.selected || [];
            self.highlightSelectedCellGroup(evt.target);
            self.config.table.selected.push({item: item});

            // On first selection, grey-out all other series on the table
            if(self.config.table.selected.length == 1) {
              self.greyOutSeries(item.seriesIndex);
            }

            if(self.config.table.selected.length > 1) {
              if(self.config.table.selected[1].item.seriesIndex == self.config.table.selected[0].item.seriesIndex) {
                self.displaySelectedIntervalStats(t, self.config.table.selected);
              }
              // Reinstate table, including ungreying-out all other series
              self.unhighlightSelected();
              delete self.config.table.selected;
              self.update();
            }
          }
        });

        // Optionally manage the plot overview behaviour
        if(this.config.overview.options.show) {
          var o = jQuery('#' + this.config.overview.id);
          var overview = this.config.overview;

          // Connect the overview to the table
          o.bind("plotselected", {self: this}, function(evt, ranges) {
            // Manage zooming
            evt.data.self.subset(ranges.xaxis.from, ranges.xaxis.to);

            // Don't fire event on the overview to prevent eternal loop
            overview.object.setSelection(ranges, true);
          });

          // Drag selection handlers for table
          t.delegate("td", "tableselecting", {self: this}, function(evt) {
            evt.data.self.config.table.selecting = true;
            evt.data.self.highlightSelectedCellGroup(evt.target);
          });

          // Subset the table based on the selection.  Overview can reinstate
          t.delegate("td", "tableselected", {self: this}, function(evt, selection) {
            var self = evt.data.self;
            delete self.config.table.selecting;

            if(selection) {
              self.config.table.selected = selection.items;

              if(self.config.table.selected.length > 1) {
                var from = self.config.table.selected[0].item.datapoint[0];
                var to = self.config.table.selected[1].item.datapoint[0];
                self.subset(from, to);
                overview.object.setSelection({xaxis: {from: from, to: to}}, true);

                // Clear selection
                self.unhighlightSelected();
                self.unhighlight();
                delete self.config.table.selected;
              }
            }
          });

          o.bind("plotunselected", {self: this}, function(evt) {
            evt.data.self.update();
          });
        }
      },

      /**
       * Setup handling for custom event triggers on a table
       */
      setupTableEventTriggers: function(t, selectors) {
        var selection = {active: false, start: null, end: null};

        // Determine between a click or a dragged selection
        t.delegate(selectors, "mousedown mouseup", {self: this}, function(evt) {
          var self = evt.data.self;
          var elem = jQuery(evt.target);

          if(evt.type == "mousedown") {
            selection.active = true;
            selection.start = evt;
            evt.preventDefault();
            elem.trigger("tableselecting");
          }
          if(evt.type == "mouseup") {
            selection.active = false;
            selection.end = evt;

            if(selection.start.target == selection.end.target) {
              elem.trigger("tableclick");
            } else {
              var items = [];
              items.push({item: self.eventToItem(selection.start)});
              items.push({item: self.eventToItem(selection.end)});

              if(items[1].item.dataIndex < items[0].item.dataIndex) {
                items.reverse();
              }
              elem.trigger("tableselected", {items: items});
            }
          }
        });
      },

      /**
       * Reset table's event handlers
       */
      resetBehaviour: function() {
        var t = jQuery('#' + this.config.table.id);
        var o = jQuery('#' + this.config.overview.id);

        if(t.length > 0) {
          t.unbind();
        }
        if(o.length > 0) {
          o.unbind();
        }
      },

      /**
       * Get the observation data from the SOS for each additional set of
       * query parameters, & then update the existing table
       */
      addData: function() {
        if(SOS.Utils.isValidObject(this.additional)) {
          for(var i = 0, len = this.additional.length; i < len; i++) {
            jQuery.extend(true, this, this.additional[i]);
            this._getOffering();

            if(this.haveValidOfferingObject()) {
              if(SOS.Utils.isValidObject(this.observedProperty)) {
                this.offering.filterObservedProperties(this.observedProperty);
              }
              this.determineObservationQueryTimeParameters();
              this.offering.registerUserCallback({event: "obsavailable", scope: this, callback: this.drawAdditionalData});
              this.offering.getObservations(this.startDatetime, this.endDatetime);
            }
          }
        }
      },

      /**
       * Add the given observation data to an existing table
       */
      drawAdditionalData: function() {
        // Avoid infinite loop as each additional listens for obsavailable
        this.offering.unregisterUserCallback({event: "obsavailable", scope: this, callback: this.drawAdditionalData});

        // Construct the data series
        var table = this.constructDataTable(this.offering);
        this.config.table.series.push(table);

        this.update();

        // Optionally update the plot overview also
        if(this.config.overview.options.show) {
          this.config.overview.series = this.config.table.series;
          this.updateOverview();
        }
      },

      /**
       * Redraw an existing table
       */
      update: function() {
        this.config.table.object.html("");
        this.generateTable(this.config.table.object, this.config.table.series, this.config.table.options);
      },

      /**
       * Redraw an existing overview plot
       */
      updateOverview: function() {
        this.config.overview.object.setData(this.config.overview.series);
        this.config.overview.object.setupGrid();
        this.config.overview.object.draw();
      },

      /**
       * Reset an existing plot (& overview)
       */
      reset: function() {
        this.resetSeries();
        this.resetOverviewSeries();
        this.resetBehaviour();

        if(SOS.Utils.isValidObject(this.config.table.options.header.headerLabel)) {
          this.config.table.options.header.headerLabel = null;
        }
      },

      /**
       * Grey-out all except the given series on the table.  Specifying a series
       * index of -1 will grey-out all series.  Call update() to reinstate
       * table to original colours
       */
      greyOutSeries: function(seriesIndex) {
        var series = this.config.table.series;
        var style = {color: "rgb(240, 240, 240)"};

        for(var i = 0, slen = series.length; i < slen; i++) {
          if(i != seriesIndex) {
            jQuery('th[class="sos-table"][id="sl' + i + '"]').css(style);
            jQuery('th[class="sos-table"][id="ch' + i + '"]').css(style);
            jQuery('td[class="sos-table"][id^="' + i + '"]').css(style);
          }
        }
      },

      /**
       * Reset series of an existing table
       */
      resetSeries: function() {
        this.config.table.series = [];
      },

      /**
       * Reset series of an existing overview plot
       */
      resetOverviewSeries: function() {
        this.config.overview.series = [];
      },

      /**
       * Subset an existing table
       */
      subset: function(from, to) {
        var subset = this.subsetDataSeries(this.config.table.series, from, to);

        if(subset) {
          this.config.table.object.html("");
          this.generateTable(jQuery('#' + this.config.table.id), subset, this.config.table.options);
        }
      },

      /**
       * Generate a table of the given observation data
       */
      generateTable: function(t, series, options) {
        var tcontent = "";
        var lengths = [];
        var ft = this.config.format.time;
        var fv = this.config.format.value;

        for(var i = 0, len = series.length; i < len; i++) {
          lengths.push(series[i].data.length);
        }
        var maxrows = Math.max.apply(null, lengths);
 
        tcontent += '<thead class="sos-table">';
        tcontent += '<tr class="sos-table">';

        // Series label
        for(var i = 0, len = series.length; i < len; i++) {
          tcontent += '<th id="sl' + i + '" class="sos-table" colspan="2">' + series[i].label + '</th>';
        }
        tcontent += '</tr>';
        tcontent += '<tr class="sos-table">';

        // Per series column headings
        for(var i = 0, len = series.length; i < len; i++) {
          tcontent += '<th id="ch' + i + '" class="sos-table">Time</th>';
          tcontent += '<th id="ch' + i + '" class="sos-table">Value</th>';
        }
        tcontent += '</tr>';
        tcontent += '</thead>';
        tcontent += '<tfoot class="sos-table"/>';
        tcontent += '<tbody class="sos-table">';

        // Per series data
        for(var i = 0; i < maxrows; i++) {
          var cssClass = (i % 2 == 0 ? "sos-table-even" : "sos-table-odd");
          tcontent += '<tr class="' + cssClass + '">';

          for(var j = 0, slen = series.length; j < slen; j++) {
            if(SOS.Utils.isValidObject(series[j].data[i])) {
              for(var k = 0, dlen = series[j].data[i].length; k < dlen; k++) {
                var id = j + "." + i + "." + k, datum;

                // Format the datetime or value accordingly
                if(k == 0) {
                  datum = ft.formatter(series[j].data[i][k]);
                } else {
                  datum = (SOS.Utils.isNumber(series[j].data[i][k]) ? fv.formatter(parseFloat(series[j].data[i][k]), fv.sciLimit, fv.digits) : series[j].data[i][k]);
                }
                tcontent += '<td class="sos-table" id="' + id + '">' + datum + '</td>';
              }
            } else {
              tcontent += '<td></td><td></td>';
            }
          }
          tcontent += '</tr>';
        }
        tcontent += '</tbody>';

        var tableText = '<table class="sos-table">';
        tableText += (SOS.Utils.isValidObject(options.header.headerLabel) ? '<caption class="sos-table">' + options.header.headerLabel + '</caption>' : '');
        tableText += tcontent;
        tableText += '</table>';
        var table = jQuery(tableText);

        // Optionally the table can be scrollable
        if(options.scrollable) {
          table.addClass("sos-table-scrollable");
        }
        t.append(table);

        return t;
      },

      /**
       * Convert an event object to a flot-item-like object
       */
      eventToItem: function(evt) {
        var item;

        if(evt.target) {
          var a = evt.target.id.split(".");

          // Only construct the item if a valid data target was clicked on
          if(a.length >= 2) {
            item = {datapoint: [], dataIndex: 0, series: {}, seriesIndex: 0, pageX: 0, pageY: 0};
            item.seriesIndex = parseInt(a[0], 10);
            item.dataIndex = parseInt(a[1], 10);

            if(SOS.Utils.isValidObject(this.config.table.series)) {
              item.series = this.config.table.series[item.seriesIndex];
              item.datapoint = item.series.data[item.dataIndex];
            }
            item.pageX = evt.pageX;
            item.pageY = evt.pageY;
          }
        }

        return item;
      },

      /**
       * Highlight a given cell in the table
       */
      highlight: function(elem) {
        jQuery(elem).addClass("sos-table-highlight");
      },

      /**
       * Toggle highlight on a given cell in the table
       */
      toggleHighlight: function(elem) {
        jQuery(elem).toggleClass("sos-table-highlight");
      },

      /**
       * Unhighlight any highlighted cells in the table
       */
      unhighlight: function() {
        if(SOS.Utils.isValidObject(this.config.table.object)) {
          this.config.table.object.find("td").removeClass("sos-table-highlight");
        }
      },

      /**
       * Highlight a given datetime & value cell-group in the table
       */
      highlightCellGroup: function(elem) {
        var cell = jQuery(elem);
        this.highlight(cell);
        (cell.index() % 2 == 0) ? this.highlight(cell.next()) : this.highlight(cell.prev());
      },

      /**
       * Toggle highlight on a given datetime & value cell-group in the table
       */
      toggleHighlightCellGroup: function(elem) {
        var cell = jQuery(elem);
        this.toggleHighlight(cell);
        (cell.index() % 2 == 0) ? this.toggleHighlight(cell.next()) : this.toggleHighlight(cell.prev());
      },

      /**
       * Highlight a given selected cell in the table
       */
      highlightSelected: function(elem) {
        jQuery(elem).addClass("sos-table-highlight-selected");
      },

      /**
       * Unhighlight any selected cells in the table
       */
      unhighlightSelected: function() {
        if(SOS.Utils.isValidObject(this.config.table.object)) {
          this.config.table.object.find("td").removeClass("sos-table-highlight-selected");
        }
      },

      /**
       * Highlight a given selected datetime & value cell-group in the table
       */
      highlightSelectedCellGroup: function(elem) {
        var cell = jQuery(elem);
        this.highlightSelected(cell);
        (cell.index() % 2 == 0) ? this.highlightSelected(cell.next()) : this.highlightSelected(cell.prev());
      }
    });
  }

  /* Create the SOS.Map namespace */
  if(typeof SOS.Map === "undefined") {
    /**
     * SOS.Map Class
     * Class for displaying a map of data served from a SOS
     *
     * Inherits from:
     *  - <SOS.Ui>
     */
    SOS.Map = OpenLayers.Class(SOS.Ui, {
      url: null,
      sos: null,
      config: {
        map: {
          object: null,
          id: "sosMap",
          options: {
            defaultProjection: new OpenLayers.Projection("EPSG:4326"),
            centre: new OpenLayers.LonLat(0, 0),
            params: {
              projection: "EPSG:4326",
              displayProjection: new OpenLayers.Projection("EPSG:4326")
            }
          }
        },
        overview: {
          options: {
            show: false
          }
        },
        baseLayer: {
          object: null,
          id: "sosMapBaseLayer",
          options: {
            label: "OpenLayers WMS",
            url: "http://vmap0.tiles.osgeo.org/wms/vmap0?",
            params: {
              layers: "basic"
            }
          }
        },
        featureOfInterestLayer: {
          object: null,
          id: "sosMapFeatureOfInterestLayer",
          options: {
            label: "Feature Of Interest",
            pointStyle: new OpenLayers.Style({
              "pointRadius": 5,
              "fillColor": "#F80000",
              "strokeWidth": 1,
              "label": "${name}",
              "fontSize": "12px",
              "fontFamily": "Courier New, monospace",
              "fontWeight": "bold",
              "labelAlign": "rb",
              "labelXOffset": -10,
              "labelOutlineColor": "white",
              "labelOutlineWidth": 3
            })
          }
        }
      },
      CLASS_NAME: "SOS.Map",

      /**
       * Constructor for a SOS.Map object
       *
       * @constructor
       */
      initialize: function(options) {
        jQuery.extend(true, this, options);
      },

      /**
       * Destructor for a SOS.Map object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Set options for the map
       */
      setMapOptions: function(options) {
        jQuery.extend(true, this.config.map.options, options);
      },

      /**
       * Set options for the map overview
       */
      setOverviewOptions: function(options) {
        jQuery.extend(true, this.config.overview.options, options);
      },

      /**
       * Set options for the base layer
       */
      setBaseLayerOptions: function(options) {
        jQuery.extend(true, this.config.baseLayer.options, options);
      },

      /**
       * Set options for the feature-of-interest (FOI) layer
       */
      setFeatureOfInterestLayerOptions: function(options) {
        jQuery.extend(true, this.config.featureOfInterestLayer.options, options);
      },

      /**
       * Generate the map using this object's properties to query the SOS
       */
      display: function(options) {
        // Parameters can optionally be tweaked for each call
        if(arguments.length > 0) {
          jQuery.extend(true, this, options);
        }

        if(!this.haveValidCapabilitiesObject()) {
          this.getCapabilities(this._display);
        } else {
          this._display();
        }
      },

      /**
       * Get data from the SOS according to this object's properties, & then
       * draw the map
       */
      _display: function() {
        this.initMap();
        this.initBaseLayer();
        this.initView();
        this.initFeatureOfInterestLayer();
      },
 
      /**
       * Initialise the map
       */
      initMap: function() {
        var m = jQuery('#' + this.config.map.id);

        // If map div doesn't exist, create one on the fly
        if(m.length < 1) {
          m = jQuery('<div id="' + this.config.map.id + '" class="sos-map"/>');
          jQuery('body').append(m);
        }

        // Setup the map object & its controls
        var map = new OpenLayers.Map(this.config.map.id, this.config.map.options.params);

        map.addControl(new OpenLayers.Control.LayerSwitcher());
        map.addControl(new OpenLayers.Control.MousePosition());

        // Optionally generate the map overview
        if(this.config.overview.options.show) {
          var params = this.config.overview.options.params || {};
          map.addControl(new OpenLayers.Control.OverviewMap(params));
        }

        this.config.map.object = map;
      },
 
      /**
       * Initialise the map base layer
       */
      initBaseLayer: function() {
        var map = this.config.map.object;

        // Setup the map's base layer, and its controls
        var baseLayer = new OpenLayers.Layer.WMS(this.config.baseLayer.options.label, this.config.baseLayer.options.url, this.config.baseLayer.options.params);

        map.addLayers([baseLayer]);

        this.config.baseLayer.object = baseLayer;
      },
 
      /**
       * Initialise the map view
       */
      initView: function() {
        var map = this.config.map.object;
        var centre = this.config.map.options.centre || new OpenLayers.LonLat(0, 0);

        map.setCenter(centre);
        map.zoomToMaxExtent();
      },
  
      /**
       * Initialise the feature-of-interest layer
       */
      initFeatureOfInterestLayer: function() {
        var styleMap = new OpenLayers.StyleMap(this.config.featureOfInterestLayer.options.pointStyle);

        // Query FOIs from the SOS and present them as a vector layer
        var layer = new OpenLayers.Layer.Vector(this.config.featureOfInterestLayer.options.label, {
          strategies: [new OpenLayers.Strategy.Fixed()],
          protocol: new OpenLayers.Protocol.SOS({
            formatOptions: {
              internalProjection: this.config.map.object.getProjectionObject(),
              externalProjection: this.config.map.options.defaultProjection
            },
            url: this.url,
            fois: this.sos.getFeatureOfInterestIds()
          }),
          styleMap: styleMap
        });
        this.config.map.object.addLayer(layer);

        // Setup behaviour for this layer
        var ctrl = new OpenLayers.Control.SelectFeature(layer, {
          scope: this,
          onSelect: this.featureOfInterestSelectHandler
        });
        this.config.map.object.addControl(ctrl);
        ctrl.activate();

        this.config.featureOfInterestLayer.object = layer;
      },

      /**
       * Setup behaviour for when user clicks on a feature-of-interest (FOI)
       */
      featureOfInterestSelectHandler: function(feature) {
        var item = {
          foi: {id: feature.attributes.id, geometry: feature.geometry}
        };

        // Store each selected item (FOI)
        this.config.map.selected = [];
        this.config.map.selected.push({item: item});

        // Show this FOI's latest observation values in a popup
        this.sos.registerUserCallback({event: "latestobsavailable", scope: this, callback: this.displayLatestObservations});
        this.sos.getLatestObservationsForFeatureOfInterestId(item.foi.id);

        // For external listeners (application-level plumbing)
        this.sos.events.triggerEvent("sosMapFeatureOfInterestSelect");
      },

      /**
       * Display the latest observation values for the selected FOI
       */
      displayLatestObservations: function() {
        var map = this.config.map.object;

        if(SOS.Utils.isValidObject(this.config.map.selected)) {
          var feature = this.config.map.selected[0].item.foi;

          // Remove any existing popups (works but is a bit blunt!)
          for(var i = 0, len = map.popups.length; i < len; i++) {
            map.removePopup(map.popups[i]);
          };

          // Display latest observations table for this feature in a popup
          var popup = new OpenLayers.Popup.FramedCloud("sosLatestObservations",
            feature.geometry.getBounds().getCenterLonLat(),
            null,
            this.populateMultivariateTable(this.sos),
            null,
            true,
            function(e) {
              this.hide();
              OpenLayers.Event.stop(e);
              // Unselect so popup can be shown again
              this.map.getControlsByClass('OpenLayers.Control.SelectFeature')[0].unselectAll();
          });
          map.addPopup(popup);
        }
      },

      /**
       * Construct a table of data from multiple variables
       */
      populateMultivariateTable: function(sos) {
        var tcontent = "", html = "";

        if(SOS.Utils.isValidObject(sos)) {
          for(var i = 0, len = sos.getCountOfObservations(); i < len; i++) {
            var ob = sos.getObservationRecord(i);
            var cssClass = (i % 2 == 0 ? "sos-table-even" : "sos-table-odd");
            tcontent += '<tr class="' + cssClass + '">';
            tcontent += '<td class="sos-table">' + ob.observedPropertyTitle + '</td>';
            tcontent += '<td class="sos-table">' + ob.time + '</td>';
            tcontent += '<td class="sos-table">' + ob.result.value + ' ' + ob.UomTitle + '</td>';
            tcontent += '</tr>';
          }
          html += '<table class="sos-table sos-embedded-table">';
          html += '<caption class="sos-table"></caption>';
          html += '<thead class="sos-table">';
          html += '<tr class="sos-table">';
          html += '<th class="sos-table">Observed Property</th>';
          html += '<th class="sos-table">Time</th>';
          html += '<th class="sos-table">Value</th>';
          html += '</tr>';
          html += '</thead>';
          html += '<tfoot/>';
          html += '<tbody>';
          html += tcontent;
          html += '</tbody>';
          html += '</table>';
        }

        return html;
      }
    });
  }

  /* Create the SOS.Menu namespace */
  if(typeof SOS.Menu === "undefined") {
    /**
     * SOS.Menu Class
     * Class for displaying a menu of data served from a SOS
     *
     * Inherits from:
     *  - <SOS.Ui>
     */
    SOS.Menu = OpenLayers.Class(SOS.Ui, {
      url: null,
      sos: null,
      config: {
        menu: {
          object: null,
          id: "sosMenu",
          entries: [],
          step: 0,
          options: {
            tabs: {
              offerings: {
                label: "Offerings",
                prompt: "Please select a Feature Of Interest"
              },
              observedProperties: {
                label: "Observed Properties",
                prompt: "Please select an Offering"
              },
              controls: {
                label: "Controls",
                prompt: "Please select an Observed Property"
              }
            },
            listBoxes: {
              multiple: false,
              size: 5,
              useSelectBox: false
            },
            datePickers: {
              // N.B.: This is a 4-digit year
              dateFormat: "yy-mm-dd",
              autoSize: true,
              changeYear: true,
              changeMonth: true,
              onSelect: function(s, ui) {jQuery(this).trigger('change');}
            }
          }
        }
      },
      CLASS_NAME: "SOS.Menu",

      /**
       * Constructor for a SOS.Menu object
       *
       * @constructor
       */
      initialize: function(options) {
        jQuery.extend(true, this, options);
      },

      /**
       * Destructor for a SOS.Menu object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Set options for the menu
       */
      setMenuOptions: function(options) {
        jQuery.extend(true, this.config.menu.options, options);
      },

      /**
       * Set the menu initially empty (waiting for an FOI to be provided)
       */
      setInitialViewBlank: function() {
        this.config.menu.step = -1;
      },

      /**
       * Generate the menu using this object's properties to query the SOS
       */
      display: function(options) {
        // Parameters can optionally be tweaked for each call
        if(arguments.length > 0) {
          jQuery.extend(true, this, options);
        }

        if(!this.haveValidCapabilitiesObject()) {
          this.getCapabilities(this._display);
        } else {
          this._display();
        }
      },

      /**
       * Get data from the SOS according to this object's properties, & then
       * draw the menu
       */
      _display: function() {
        this.constructMenu();

        // We can use the step property to determine initial menu view
        if(this.config.menu.step == -1) {
          this.config.menu.step = 0;
          this.displayBlankMenu();
        } else if(this.config.menu.step == 1) {
          this.config.menu.step = 2;
          this.displayObservedProperties();
        }
        else {
          this.config.menu.step = 1;
          this.displayOfferings();
        }
        if(SOS.Utils.isValidObject(this.config.menu.options.tabs.controls)) {
          this.displayControls();
        }
      },

      /**
       * Display an initial empty menu (waiting for an FOI to be provided)
       */
      displayBlankMenu: function() {
        this.initBlankMenu();
      },

      /**
       * Display the offerings
       */
      displayOfferings: function() {
        var tab = jQuery('#' + this.config.menu.id + 'OfferingsTab');
        this.constructOfferingsEntries();
        this.initMenu(tab);
        this.setupOfferingsBehaviour();
      },

      /**
       * Construct the offerings menu entries
       */
      constructOfferingsEntries: function() {
        var ids = [], names = [];
        this.config.menu.entries = [];

        /* If an FOI was selected, then only get offerings for that FOI.
           Otherwise we get all offerings */
        if(this.config.menu.selected && this.config.menu.selected.length > 0) {
          var foiId = this.config.menu.selected[0].item.foi.id;
          var offerings = [];
          offerings = offerings.concat(this.sos.getOfferingsForFeatureOfInterestId(foiId));

          for(var i = 0, len = offerings.length; i < len; i++) {
            ids.push(offerings[i].id);
            names.push(offerings[i].name);
          }
        } else {
          ids = this.sos.getOfferingIds();
          names = this.sos.getOfferingNames();
        }

        for(var i = 0, len = ids.length; i < len; i++) {
          var entry = {value: ids[i], text: names[i]};
          this.config.menu.entries.push(entry);
        }
      },

      /**
       * Setup event handlers to manage the offerings menu behaviour
       */
      setupOfferingsBehaviour: function() {
        var m = jQuery('#' + this.config.menu.id);
        var s = jQuery('#' + this.config.menu.id + 'OfferingsTab > .sos-menu-select-list');

        // List observed properties for each selected offering
        s.bind("change", {self: this}, function(evt) {
          var self = evt.data.self;
          var vals = [];
          self.config.menu.selected = [];

          /* Ensure vals is array, even if listbox is singular
             (otherwise vals.length is the string length of the entry!) */
          vals = vals.concat(jQuery(this).val());

          for(var i = 0, len = vals.length; i < len; i++) {
            var item = {offering: {id: vals[i]}};
            self.config.menu.selected.push({item: item});
          }
          self.displayObservedProperties();

          // For external listeners (application-level plumbing)
          self.sos.events.triggerEvent("sosMenuOfferingChange");
        });
      },

      /**
       * Display the observed properties
       */
      displayObservedProperties: function() {
        var tab = jQuery('#' + this.config.menu.id + 'ObservedPropertiesTab');
        this.constructObservedPropertiesEntries();
        this.initMenu(tab);
        this.setupObservedPropertiesBehaviour();
      },

      /**
       * Construct the observed properties menu entries
       */
      constructObservedPropertiesEntries: function() {
        var ids = [], names = [];
        this.config.menu.entries = [];

        for(var i = 0, len = this.config.menu.selected.length; i < len; i++) {
          var offeringId = this.config.menu.selected[i].item.offering.id;
          var offering = this.sos.getOffering(offeringId);
          ids = offering.getObservedPropertyIds();
          names = SOS.Utils.toTitleCase(SOS.Utils.toDisplayName(SOS.Utils.urnToName(offering.getObservedPropertyNames())));
        }
        for(var i = 0, len = ids.length; i < len; i++) {
          var entry = {value: ids[i], text: names[i]};
          this.config.menu.entries.push(entry);
        }
      },

      /**
       * Setup event handlers to manage the observed properties menu behaviour
       */
      setupObservedPropertiesBehaviour: function() {
        var m = jQuery('#' + this.config.menu.id);
        var s = jQuery('#' + this.config.menu.id + 'ObservedPropertiesTab > .sos-menu-select-list');

        // Each selected item contains the offering & observed property
        s.bind("change", {self: this}, function(evt) {
          var self = evt.data.self;
          var vals = [];
          self.config.menu.selected = self.config.menu.selected || [];
          vals = vals.concat(jQuery(this).val());

          for(var i = 0, vlen = vals.length; i < vlen; i++) {
            for(var j = 0, slen = self.config.menu.selected.length; j < slen; j++) {
              self.config.menu.selected[j].item.observedProperty = vals[i];
            }
          }
          // For external listeners (application-level plumbing)
          self.sos.events.triggerEvent("sosMenuObservedPropertyChange");
        });
      },

      /**
       * Display the controls
       */
      displayControls: function() {
        this.constructControls();
        this.setupControlsBehaviour();
      },

      /**
       * Construct the controls
       */
      constructControls: function() {
        var tab = jQuery('#' + this.config.menu.id + 'ControlsTab');

        tab.html("");

        // Control section container
        var csc = jQuery('<p class="sos-control-section"/>');
        csc.append(jQuery('<span class="sos-control-title">Date Range</span>'));
        tab.append(csc);

        // Start datetime
        var sd = jQuery('<input type="text" id="' + this.config.menu.id + 'ControlsStartDatetime"/>');
        sd.datepicker(this.config.menu.options.datePickers);
        csc.append('<br/>', sd);

        // End datetime
        var ed = jQuery('<input type="text" id="' + this.config.menu.id + 'ControlsEndDatetime"/>');
        ed.datepicker(this.config.menu.options.datePickers);
        csc.append('<br/>', ed);
      },

      /**
       * Setup event handlers to manage the controls behaviour
       */
      setupControlsBehaviour: function() {
        var sd = jQuery('#' + this.config.menu.id + 'ControlsStartDatetime');
        var ed = jQuery('#' + this.config.menu.id + 'ControlsEndDatetime');

        // Add the start/end date to any selected items
        sd.bind("change", {self: this, pos: "start"}, this.datepickerChangeHandler);
        ed.bind("change", {self: this, pos: "end"}, this.datepickerChangeHandler);
      },

      /**
       * Event handler for datepicker change
       */
      datepickerChangeHandler: function(evt) {
        var self = evt.data.self;
        var pos = evt.data.pos;
        self.config.menu.selected = self.config.menu.selected || [];
        var len = self.config.menu.selected.length;
        var val = jQuery(this).val();

        // N.B.: The pos property identifies whether this is a start/end date

        // Add date to any existing menu items, or create if none exist
        if(len > 0) {
          for(var i = 0; i < len; i++) {
            self.config.menu.selected[i].item.time = self.config.menu.selected[i].item.time || {};
            if(pos == "start") {
              self.config.menu.selected[i].item.time.startDatetime = val;
            } else if(pos == "end") {
              self.config.menu.selected[i].item.time.endDatetime = val;
            }
          }
        } else {
          var item = {time: {}};

          if(pos == "start") {
            item.time = {startDatetime: val};
          } else if(pos == "end") {
            item.time = {endDatetime: val};
          }
          self.config.menu.selected.push({item: item});
        }
        // For external listeners (application-level plumbing)
        if(pos == "start") {
          self.sos.events.triggerEvent("sosMenuStartDatetimeChange");
        } else if(pos == "end") {
          self.sos.events.triggerEvent("sosMenuEndDatetimeChange");
        }
      },

      /**
       * Construct the menu according to this object's properties
       */
      constructMenu: function() {
        var mc = jQuery('#' + this.config.menu.id + 'Container');
        var m = jQuery('#' + this.config.menu.id);

        // If menu container div doesn't exist, create one on the fly
        if(mc.length < 1) {
          mc = jQuery('<div id="' + this.config.menu.id + 'Container" class="sos-menu-container"/>');
          jQuery('body').append(mc);
        }

        // If menu div doesn't exist, create one on the fly
        if(m.length < 1) {
          m = jQuery('<div id="' + this.config.menu.id + '" class="sos-menu"/>');
          mc.append(m);
        }

        // Construct the menu according to what tabs have been configured
        var tabs = this.constructMenuTabs();

        if(tabs) {
          m.append(tabs);
        }

        // Setup menu event handlers
        m.bind('accordionchange', {self: this}, this.changeMenuTabHandler);
        m.accordion({fillSpace: true});

        this.config.menu.object = m;
      },

      /**
       * Construct menu tabs according to this object's properties
       */
      constructMenuTabs: function() {
        var tabs, text = "";
        var options = this.config.menu.options;

        if(SOS.Utils.isValidObject(options.tabs.offerings)) {
          text += '<h3><a href="#">' + options.tabs.offerings.label + '</a></h3><div id="' + this.config.menu.id + 'OfferingsTab"></div>';
        }
        if(SOS.Utils.isValidObject(options.tabs.observedProperties)) {
          text += '<h3><a href="#">' + options.tabs.observedProperties.label + '</a></h3><div id="' + this.config.menu.id + 'ObservedPropertiesTab"></div>';
        }
        if(SOS.Utils.isValidObject(options.tabs.controls)) {
          text += '<h3><a href="#">' + options.tabs.controls.label + '</a></h3><div id="' + this.config.menu.id + 'ControlsTab"></div>';
        }

        tabs = jQuery(text);

        return tabs;
      },

      /**
       * Initialise menu entries according to this object's properties
       */
      initMenu: function(tab) {
        var lb = this.config.menu.options.listBoxes;
        var s = jQuery('<select id="' + this.config.menu.id + 'SelectList"' + (lb.multiple ? ' multiple="multiple"' : '') + (lb.size ? ' size="' + lb.size + '"' : '') + ' class="sos-menu-select-list"></select>');
        var options = [];

        tab.html("");
        tab.append(s);

        // Initialise the menu entries
        for(var i = 0, len = this.config.menu.entries.length; i < len; i++) {
          options.push('<option value="' + this.config.menu.entries[i].value + '">' + this.config.menu.entries[i].text + '</option>');
        }
        s.html(options.join(''));

        if(lb.useSelectBox && typeof jQuery('body').selectBox == "function") {
          // This call uses a jquery plugin to replace vanilla select boxes
          jQuery('.sos-menu-select-list').selectBox();
        }
      },

      /**
       * Initialise an initial blank menu according to this object's properties
       */
      initBlankMenu: function() {
        var options = this.config.menu.options;

        if(SOS.Utils.isValidObject(options.tabs.offerings)) {
          var t = jQuery('#' + this.config.menu.id + 'OfferingsTab');

          if(typeof t.html() == "undefined" || jQuery.trim(t.html()) == "") {
            t.html(options.tabs.offerings.prompt);
          }
        }
        if(SOS.Utils.isValidObject(options.tabs.observedProperties)) {
          var t = jQuery('#' + this.config.menu.id + 'ObservedPropertiesTab');

          if(typeof t.html() == "undefined" || jQuery.trim(t.html()) == "") {
            t.html(options.tabs.observedProperties.prompt);
          }
        }
        if(SOS.Utils.isValidObject(options.tabs.controls)) {
          var t = jQuery('#' + this.config.menu.id + 'ControlsTab');

          if(typeof t.html() == "undefined" || jQuery.trim(t.html()) == "") {
            t.html(options.tabs.controls.prompt);
          }
        }
      },

      /**
       * Setup behaviour for when user moves between menu tabs
       */
      changeMenuTabHandler: function(evt, ui) {
        var self = evt.data.self;
        var options = self.config.menu.options;

        if(SOS.Utils.isValidObject(options.tabs.offerings)) {
          if(ui.newHeader.text() == options.tabs.offerings.label) {
            var t = jQuery('#' + self.config.menu.id + 'OfferingsTab');

            if(typeof t.html() == "undefined" || jQuery.trim(t.html()) == "") {
              t.html(options.tabs.offerings.prompt);
            }
          }
        }
        if(SOS.Utils.isValidObject(options.tabs.observedProperties)) {
          if(ui.newHeader.text() == options.tabs.observedProperties.label) {
            var t = jQuery('#' + self.config.menu.id + 'ObservedPropertiesTab');

            if(typeof t.html() == "undefined" || jQuery.trim(t.html()) == "") {
              t.html(options.tabs.observedProperties.prompt);
            }
          }
        }
        if(SOS.Utils.isValidObject(options.tabs.controls)) {
          if(ui.newHeader.text() == options.tabs.controls.label) {
            var t = jQuery('#' + self.config.menu.id + 'ControlsTab');

            if(typeof t.html() == "undefined" || jQuery.trim(t.html()) == "") {
              t.html(options.tabs.controls.prompt);
            }
          }
        }
      }
    });
  }

  /* Create the SOS.App namespace */
  if(typeof SOS.App === "undefined") {
    /**
     * SOS.App Class
     * Application class for pulling all the SOS.Ui components together
     *
     * Inherits from:
     *  - <SOS.Ui>
     */
    SOS.App = OpenLayers.Class(SOS.Ui, {
      url: null,
      sos: null,
      offering: null,
      offeringId: null,
      observedProperty: null,
      startDatetime: null,
      endDatetime: null,
      relativeTime: null,
      config: {
        app: {
          object: null,
          id: "sosApp",
          step: 0,
          components: {
            menu: null,
            map: null,
            plot: null,
            table: null
          },
          options: {
            tabs: {
              map: {label: "Map"},
              plot: {label: "Plot"},
              table: {label: "Table"}
            },
            time: {
              useOfferingTimePeriod: false,
              ms: 31 * 8.64e7
            },
            overview: {
              show: true
            }
          }
        }
      },
      CLASS_NAME: "SOS.App",

      /**
       * Constructor for a SOS.App object
       *
       * @constructor
       */
      initialize: function(options) {
        jQuery.extend(true, this, options);
      },

      /**
       * Destructor for a SOS.App object
       * 
       * @destructor
       */
      destroy: function() {
      },

      /**
       * Set options for the app
       */
      setAppOptions: function(options) {
        jQuery.extend(true, this.config.app.options, options);
      },

      /**
       * Generate the app using this object's properties to query the SOS
       */
      display: function(options) {
        // Parameters can optionally be tweaked for each call
        if(arguments.length > 0) {
          jQuery.extend(true, this, options);
        }

        if(!this.haveValidCapabilitiesObject()) {
          this.getCapabilities(this._display);
        } else {
          this._display();
        }
      },

      /**
       * Get data from the SOS according to this object's properties, & then
       * draw the app
       */
      _display: function() {
        this.setupPlumbing();
        this.displayApp();
      },
 
      /**
       * Setup the plumbing between this app's components
       */
      setupPlumbing: function() {
        this.initComponents();
        this.setupComponentsBehaviour();
      },
 
      /**
       * Initialise this app's components
       */
      initComponents: function() {
        var components = this.config.app.components;
        var options = {
          url: this.url,
          sos: this.sos
        };

        // Instantiate the components of the app with common options
        components.menu = new SOS.Menu(options);
        components.map = new SOS.Map(options);
        components.plot = new SOS.Plot(options);
        components.table = new SOS.Table(options);

        // Set the IDs of where each component is located on the page
        components.menu.config.menu.id = this.config.app.id + "Menu";
        components.map.config.map.id = this.config.app.id + "MapPanel";
        components.plot.config.plot.id = this.config.app.id + "PlotPanel";
        components.table.config.table.id = this.config.app.id + "TablePanel";

        // Set any component-specific initial options
        components.menu.setInitialViewBlank();
        components.table.setTableOptions({scrollable: true});
        components.map.setOverviewOptions({show: true});

        // Optionally show a data overview (shared by plot, table etc.)
        if(this.config.app.options.overview.show) {
          components.plot.config.overview.id = this.config.app.id + "Overview";
          components.table.config.overview.id = this.config.app.id + "Overview";
          components.plot.setOverviewOptions({show: true});
          components.table.setOverviewOptions({show: true});
        }
      },
 
      /**
       * Setup the behaviour for this app's components
       */
      setupComponentsBehaviour: function() {
        // Register event handlers to tie the components together
        this.sos.registerUserCallback({event: "sosMapFeatureOfInterestSelect", scope: this, callback: this.sosMapFeatureOfInterestSelectHandler});

        this.sos.registerUserCallback({event: "sosMenuOfferingChange", scope: this, callback: this.sosMenuChangeHandler});

        this.sos.registerUserCallback({event: "sosMenuObservedPropertyChange", scope: this, callback: this.sosMenuChangeHandler});

        this.sos.registerUserCallback({event: "sosMenuStartDatetimeChange", scope: this, callback: this.sosMenuChangeHandler});

        this.sos.registerUserCallback({event: "sosMenuEndDatetimeChange", scope: this, callback: this.sosMenuChangeHandler});
      },
 
      /**
       * Display the app according to this object's properties
       */
      displayApp: function() {
        var ac = jQuery('#' + this.config.app.id + 'Container');
        var amc = jQuery('#' + this.config.app.id + 'MenuContainer');
        var am = jQuery('#' + this.config.app.id + 'Menu');
        var a = jQuery('#' + this.config.app.id);

        // If app container div doesn't exist, create one on the fly
        if(ac.length < 1) {
          ac = jQuery('<div id="' + this.config.app.id + 'Container" class="sos-app-container"/>');
          jQuery('body').append(ac);
        }

        // If app menu container div doesn't exist, create one on the fly
        if(amc.length < 1) {
          amc = jQuery('<div id="' + this.config.app.id + 'MenuContainer" class="sos-menu-container"/>');
          ac.append(amc);
        }

        // If app menu div doesn't exist, create one on the fly
        if(am.length < 1) {
          am = jQuery('<div id="' + this.config.app.id + 'Menu" class="sos-menu"/>');
          amc.append(am);
        }

        // If app div doesn't exist, create one on the fly
        if(a.length < 1) {
          a = jQuery('<div id="' + this.config.app.id + '" class="sos-app"/>');
          ac.append(a);
        }

        // Construct the app menu
        this.config.app.components.menu.display();

        // Construct the app according to what tabs have been configured
        var tabs = this.constructAppTabs(a);

        // Setup app tabs event handlers
        a.bind("tabscreate", {self: this}, this.initAppHandler);
        a.tabs();

        this.config.app.object = a;
      },
 
      /**
       * Construct app tabs according to this object's properties
       */
      constructAppTabs: function(container) {
        var tabs, div, divId, a, item;
        var options = this.config.app.options;

        tabs = jQuery('<ul/>');
        container.append(tabs);

        if(SOS.Utils.isValidObject(options.tabs.map)) {
          divId = this.config.app.id + "MapPanel";
          div = jQuery('<div id="' + divId + '" class="sos-map"/>');
          container.append(div);
          a = jQuery('<a href="#' + divId + '"><span class="sos-tab-header">' + options.tabs.map.label + '</span></a>');
          a.bind('click', {self: this, componentName: "map"}, this.changeAppTabHandler);
          item = jQuery('<li id="' + this.config.app.id + 'MapTab"></li>');
          item.append(a);
          tabs.append(item);

          // If we have a map panel, initialise it here
          this.initMap();
        }
        if(SOS.Utils.isValidObject(options.tabs.plot)) {
          divId = this.config.app.id + "PlotPanel";
          div = jQuery('<div id="' + divId + '" class="sos-plot"/>');
          container.append(div);
          a = jQuery('<a href="#' + divId + '"><span class="sos-tab-header">' + options.tabs.plot.label + '</span></a>');
          a.bind('click', {self: this, componentName: "plot"}, this.changeAppTabHandler);
          item = jQuery('<li id="' + this.config.app.id + 'PlotTab"></li>');
          item.append(a);
          tabs.append(item);
        }
        if(SOS.Utils.isValidObject(options.tabs.table)) {
          divId = this.config.app.id + "TablePanel";
          div = jQuery('<div id="' + divId + '" class="sos-table"/>');
          container.append(div);
          a = jQuery('<a href="#' + divId + '"><span class="sos-tab-header">' + options.tabs.table.label + '</span></a>');
          a.bind('click', {self: this, componentName: "table"}, this.changeAppTabHandler);
          item = jQuery('<li id="' + this.config.app.id + 'TableTab"></li>');
          item.append(a);
          tabs.append(item);
        }

        // Optionally show a data overview (for plot, table etc.)
        if(this.config.app.options.overview.show) {
          divId = this.config.app.id + "Overview";
          div = jQuery('<div id="' + divId + '" class="sos-plot-overview"/>');
          container.append(div);
        }

        return tabs;
      },

      /**
       * Initialise app tabs according to this object's properties
       */
      initAppHandler: function(evt) {
        var self = evt.data.self;
      },

      /**
       * Setup behaviour for when user moves between app tabs
       */
      changeAppTabHandler: function(evt) {
        var self = evt.data.self;
        var components = self.config.app.components;
        var o = jQuery('#' + self.config.app.id + 'Overview');

        // Only show overview plot on pertinent component panels
        if(o.length > 0) {
          evt.data.componentName == "map" ? o.hide() : o.show();
        }
      },
 
      /**
       * Initialise the app map
       */
      initMap: function() {
        this.config.app.components.map.display();
      },
 
      /**
       * Event handler for map feature-of-interest (FOI) select
       */
      sosMapFeatureOfInterestSelectHandler: function(evt) {
        var components = this.config.app.components;

        // Store map FOI selection in menu, & then display offerings for FOI
        components.menu.config.menu.selected = components.map.config.map.selected;
        components.menu.displayOfferings();
      },
 
      /**
       * Event handler for menu selection change
       */
      sosMenuChangeHandler: function(evt) {
        var components = this.config.app.components;
        var item;

        if(components.menu.config.menu.selected) {
          item = components.menu.config.menu.selected[0].item;
          item.time = this.getObservationQueryTimeParameters(item);
        }

        // Fetch & display observation data.  Update both plot & table
        if(this.haveRequiredObservationQueryParameters(item)) {
          jQuery.extend(true, this, {
            offeringId: item.offering.id,
            observedProperty: item.observedProperty,
            startDatetime: item.time.startDatetime,
            endDatetime: item.time.endDatetime
          });
          this.getObservationData();
        }
      },

      /**
       * Check that the given parameter is defined & not an empty string
       */
      isValidParameter: function(p) {
        return (SOS.Utils.isValidObject(p) && jQuery.trim(p) !== "");
      },

      /**
       * Check whether the given item object contains the required
       * parameters to perform a getObservation request
       */
      haveRequiredObservationQueryParameters: function(item) {
        return (SOS.Utils.isValidObject(item) &&
                SOS.Utils.isValidObject(item.offering) &&
                SOS.Utils.isValidObject(item.time) &&
                this.isValidParameter(item.offering.id) &&
                this.isValidParameter(item.observedProperty) &&
                this.isValidParameter(item.time.startDatetime) &&
                this.isValidParameter(item.time.endDatetime));
      },

      /**
       * Extract the time parameters for performing a getObservation request
       * from the given item object, or use fallback defaults
       */
      getObservationQueryTimeParameters: function(item) {
        var time = {startDatetime: null, endDatetime: null};

        // If times have been explicitly set, we just use them
        if(SOS.Utils.isValidObject(item.time) && this.isValidParameter(item.time.startDatetime) && this.isValidParameter(item.time.endDatetime)) {
          time = item.time;
        } else {
          /* Optionally we can take the full available times from the
             offering, however this could lead to performance problems */
          if(this.config.app.options.time.useOfferingTimePeriod) {
            if(SOS.Utils.isValidObject(item.offering)) {
              var offering = this.sos.getOffering(item.offering.id);
              time.startDatetime = offering.time.timePeriod.beginPosition;
              time.endDatetime = offering.time.timePeriod.endPosition;
            }
          } else {
            // Fallback default: show data between configured ms ago up to now
            if(this.config.app.options.time.ms) {
              var t = {start: new Date(), end: new Date()};
              t = SOS.Utils.adjustTimeInterval(t, -this.config.app.options.time.ms, 0);
              time.startDatetime = t.start.toISOString();
              time.endDatetime = t.end.toISOString();
            }
          }
        }

        return time;
      },
 
      /**
       * Get the observation data from the SOS according to this object's
       * properties, & then draw the plot, table etc.
       */
      getObservationData: function() {
        this._getOffering();

        if(this.haveValidOfferingObject()) {
          if(SOS.Utils.isValidObject(this.observedProperty)) {
            this.offering.filterObservedProperties(this.observedProperty);
          }
          this.determineObservationQueryTimeParameters();
          this.offering.registerUserCallback({event: "obsavailable", scope: this, callback: this.drawObservationData});
          this.offering.getObservations(this.startDatetime, this.endDatetime);
        }
      },

      /**
       * Display the given observation data (plot, table etc.)
       */
      drawObservationData: function() {
        // Avoid cumulative calls to this function
        this.offering.unregisterUserCallback({event: "obsavailable", scope: this, callback: this.drawObservationData});

        var components = this.config.app.components;

        // Ensure we create a new plot & table
        components.plot.reset();
        components.table.reset();

        // Make the plot tab the active tab, then draw the plot & table
        jQuery('#' + this.config.app.id + 'PlotPanel').html("");
        jQuery('#' + this.config.app.id + 'PlotTab a').trigger('click');
        components.plot.offering = this.offering;
        components.plot.draw();

        jQuery('#' + this.config.app.id + 'TablePanel').html("");
        components.table.offering = this.offering;
        components.table.draw();
      }
    });
  }
}

