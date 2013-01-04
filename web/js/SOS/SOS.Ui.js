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
            series: {lines: {show: true}, points: {show: false}},
            values: {sciLimit: 0.1, digits: 2},
          },
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
            series: {lines: {show: true, lineWidth: 1}, shadowSize: 0},
          },
        },
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
      setPlotOverviewOptions: function(options) {
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
       * Format the given value for display (simple)
       */
      formatValueSimple: function(v, L, N) {
        return (Math.abs(v) < L && v != 0 ? v.toExponential(N) : v.toFixed(N));
      },

      /**
       * Format the given value for display (fancy)
       */
      formatValueFancy: function(v, L, N) {
        var x = v;

        if(Math.abs(v) < L && v != 0) {
          x = v.toExponential(N);
          x = x.replace(/e(.+)/, function(match, $1, offset, original) {return (" x 10 <sup>" + $1 + "</sup>");});
        } else {
          x = v.toFixed(N);
        }

        return x;
      },

      /**
       * Default formatter for displaying values
       */
      formatValue: function() {
        return SOS.Plot.prototype.formatValueFancy.apply(this, arguments);
      },
 
      /**
       * Generate the plot using this object's properties to query the SOS
       */
      plot: function(options) {
        // Plot parameters can optionally be tweaked for each call to plot()
        if(arguments.length > 0) {
          jQuery.extend(true, this, options);
        }

        if(!this.haveValidCapabilitiesObject()) {
          this.getCapabilities(this._plot);
        } else {
          this._plot();
        }
      },

      /**
       * Add to pending plot using given additional options to query the SOS
       */
      addToPlot: function(options) {
        // Store plot parameters so they can be added to a base plot
        if(arguments.length > 0) {
          this.additional = this.additional || [];
          this.additional.push(options);
        }
      },

      /**
       * Get the observation data from the SOS according to this object's
       * properties, & then draw the plot
       */
      _plot: function() {
        this._getOffering();

        if(this.haveValidOfferingObject()) {
          if(SOS.Utils.isValidObject(this.observedProperty)) {
            this.offering.filterObservedProperties(this.observedProperty);
          }
          this.offering.registerUserCallback({event: "obsavailable", scope: this, callback: this.drawPlot});
          this.offering.getObservations(this.startDatetime, this.endDatetime);
        }
      },

      /**
       * Plot the given observation data
       */
      drawPlot: function() {
        // Avoid infinite loop as addDataToPlot() also listens for obsavailable
        this.offering.unregisterUserCallback({event: "obsavailable", scope: this, callback: this.drawPlot});

        // Construct the data series
        var table = this.constructDataTable(this.offering);
        this.config.plot.series.push(table);

        // Set any last minute defaults if not already set
        this.applyPlotDefaults();

        // Generate the plot
        this.config.plot.object = jQuery.plot(jQuery('#' + this.config.plot.id), this.config.plot.series, this.config.plot.options);

        // Optionally generate the plot overview
        if(this.config.overview.options.show) {
          this.drawOverviewPlot();
        }

        // Manage the plot's interactive behaviour
        this.setupPlotBehaviour();

        // Now we have the base plot, plot any additional data
        if(SOS.Utils.isValidObject(this.additional)) {
          this.addDataToPlot();
        }
      },

      /**
       * Get data from given SOS query result object & return as a table
       * suitable for plotting
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
       * Apply any defaults to the plot where none have been specified or
       * combination of options is nonsensical
       */
      applyPlotDefaults: function() {
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
      drawOverviewPlot: function() {
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
      setupPlotBehaviour: function() {
        var p = jQuery('#' + this.config.plot.id);
        var valueBox = jQuery("#sosPlotValueBox");
        var xlimit = ((p.offset().left + p.outerWidth()) - 220);
        var ylimit = ((p.offset().top + p.outerHeight()) - 100);

        // If no user-supplied tooltip formatter, use built-in
        if(typeof this.config.plot.options.values.formatter !== "function") {
          this.config.plot.options.values.formatter = this.formatValue;
        }

        // If valueBox div doesn't exist (the norm), create one on the fly
        if(valueBox.length < 1) {
          valueBox = jQuery('<div id="sosPlotValueBox" class="sos-plot-valuebox" style="display:none"/>');
          p.after(valueBox);
        }

        // Show data coordinates (time, value) as mouse hovers over plot
        p.bind("plothover", {self: this.config.plot.options.values}, function(evt, pos, item) {
          if(item) {
            // Ensure the value box stays within the plot boundaries.  The
            // small offsets avoid flickering when box is under mouse
            var x = Math.min(item.pageX, xlimit) + 10;
            var y = Math.min(item.pageY, ylimit) + 10;
            var value = evt.data.self.formatter(pos.y, evt.data.self.sciLimit, evt.data.self.digits);
            var html = jQuery('<p><span class="sos-plot-control-title">Time:</span> <span>' + SOS.Utils.jsTimestampToIso(pos.x) + '</span><br/><span class="sos-plot-control-title">Value:</span> <span>' + value + ' ' + item.series.uom + '</span></p>');

            valueBox.html(html);
            valueBox.css({
              position: "absolute",
              left: x + "px",
              top: y + "px",
              borderColor: item.series.color,
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
              self.greyOutCurvesOnPlot(item.seriesIndex);
            }

            if(self.config.plot.selected.length > 1) {
              if(self.config.plot.selected[1].item.seriesIndex == self.config.plot.selected[0].item.seriesIndex) {
                self.displaySelectedIntervalStats();
              }
              // Reinstate plot, including ungreying-out all other curves
              self.config.plot.object.unhighlight();
              delete self.config.plot.selected;
              self.updatePlot();
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
       * Get the observation data from the SOS for each additional set of
       * query parameters, & then update the existing plot
       */
      addDataToPlot: function() {
        if(SOS.Utils.isValidObject(this.additional)) {
          for(var i = 0, len = this.additional.length; i < len; i++) {
            jQuery.extend(true, this, this.additional[i]);
            this._getOffering();

            if(this.haveValidOfferingObject()) {
              if(SOS.Utils.isValidObject(this.observedProperty)) {
                this.offering.filterObservedProperties(this.observedProperty);
              }
              this.offering.registerUserCallback({event: "obsavailable", scope: this, callback: this.drawAdditionalDataOnPlot});
              this.offering.getObservations(this.startDatetime, this.endDatetime);
            }
          }
        }
      },

      /**
       * Add the given observation data to an existing plot
       */
      drawAdditionalDataOnPlot: function() {
        // Avoid infinite loop as each additional listens for obsavailable
        this.offering.unregisterUserCallback({event: "obsavailable", scope: this, callback: this.drawAdditionalDataOnPlot});

        // Construct the data series
        var table = this.constructDataTable(this.offering);
        this.config.plot.series.push(table);

        this.updatePlot();

        // Optionally update the plot overview also
        if(this.config.overview.options.show) {
          this.config.overview.series = this.config.plot.series;
          this.updateOverviewPlot();
        }
      },

      /**
       * Display summary stats about the given selected observation data
       */
      displaySelectedIntervalStats: function() {
        var p = jQuery('#' + this.config.plot.id);

        var series = this.config.plot.selected[0].item.series;
        var start = Math.min(this.config.plot.selected[0].item.dataIndex, this.config.plot.selected[1].item.dataIndex);
        var end = Math.max(this.config.plot.selected[0].item.dataIndex, this.config.plot.selected[1].item.dataIndex);
        var subset = series.data.slice(start, end + 1);
        var values = SOS.Utils.extractColumn(subset, 1);
        var stats = SOS.Utils.computeStats(values);
        var hist = SOS.Utils.computeHistogram(values);

        var panel = jQuery('<div/>');
        this.addSelectedIntervalStatsContent(panel, stats, hist);
        p.after(panel);

        var buttons = [
          {text: "Close", click: function() {$(this).dialog("close");}}
        ];

        var dialog = panel.dialog({position: ['center', 'center'], buttons: buttons, title: series.label, width: 540, zIndex: 1010, stack: false});
        dialog.bind('dialogclose', function() {$(this).dialog("destroy");});
      },

      /**
       * Add summary stats content to dialog
       */
      addSelectedIntervalStatsContent: function(panel, stats, hist) {
        var series = this.config.plot.selected[0].item.series;
        var st = jQuery('<div id="sosSelectedIntervalStatsTable" class="sos-selected-interval-stats-table"/>');
        var sp = jQuery('<div id="sosSelectedIntervalStatsPlot" class="sos-selected-interval-stats-plot" style="width: 300px; height: 150px;"/>');
        var tbody = "";

        /* N.B.: It's crucial that any flot plot has width & height set.  The
                 above somewhat redundant style for the plot div is required
                 because IE & chrome don't see the CSS class definition before
                 the plot is generated, causing an uncaught exception */

        // Construct stats table
        for(var key in {min: 0, max: 0, mean: 0, median: 0, q1: 0, q3: 0, variance: 0, sd: 0}) {
          tbody += '<tr>';
          tbody += '<td class="sos-plot-control-title">' + key + '</td>';
          tbody += '<td> = ' + this.formatValue(parseFloat(stats[key]), this.config.plot.options.values.sciLimit, this.config.plot.options.values.digits) + '</td>';
          tbody += '</tr>';
        }

        var table = '<table><tbody>';
        table += tbody;
        table += '</tbody></table>';
        st.append(table);

        panel.append('<span class="sos-plot-control-title">' + series.name + ' / ' + series.uom + '</span>', '<hr></hr>');
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
              barWidth: hist.binWidth,
            },
          },
        };
        this.config.stats.object = jQuery.plot(sp, this.config.stats.series, this.config.stats.options);
      },

      /**
       * Redraw an existing plot
       */
      updatePlot: function() {
        this.config.plot.object.setData(this.config.plot.series);
        this.config.plot.object.setupGrid();
        this.config.plot.object.draw();
      },

      /**
       * Redraw an existing overview plot
       */
      updateOverviewPlot: function() {
        this.config.overview.object.setData(this.config.overview.series);
        this.config.overview.object.setupGrid();
        this.config.overview.object.draw();
      },

      /**
       * Grey-out all except the given curve on the plot.  Specifying a series
       * index of -1 will grey-out all curves.  Call updatePlot() to reinstate
       * plot to original colours
       */
      greyOutCurvesOnPlot: function(seriesIndex) {
        var series = this.config.plot.object.getData();

        for(var i = 0, len = series.length; i < len; i++) {
          if(i != seriesIndex) {
            series[i].color = "rgb(240, 240, 240)";
          }
        }
        this.config.plot.object.setupGrid();
        this.config.plot.object.draw();
      },
    });
  }
}

