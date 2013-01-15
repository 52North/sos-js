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
    "SOSValueString": "Value",
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
          tcontent += '<td class="sos-plot-control-title">' + key + '</td>';
          tcontent += '<td> = ' + fv.formatter(parseFloat(stats[key]), fv.sciLimit, fv.digits) + '</td>';
          tcontent += '</tr>';
        }

        var table = '<table><tbody>';
        table += tcontent;
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
        format: {
          time: {
            formatter: SOS.Utils.jsTimestampToIso,
          },
          value: {
            sciLimit: 0.1,
            digits: 2,
            formatter: SOS.Ui.prototype.formatValueFancy,
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
            var html = jQuery('<p><span class="sos-plot-control-title">Time:</span> <span>' + ft.formatter(pos.x) + '</span><br/><span class="sos-plot-control-title">Value:</span> <span>' + fv.formatter(pos.y, fv.sciLimit, fv.digits) + ' ' + item.series.uom + '</span></p>');

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
      config: {
        table: {
          object: null,
          id: "sosTable",
          series: [],
          options: {
            header: {},
          },
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
            series: {lines: {show: true, lineWidth: 1}, shadowSize: 0},
          },
        },
        format: {
          time: {
            formatter: SOS.Utils.jsTimestampToIso,
          },
          value: {
            sciLimit: 0.1,
            digits: 2,
            formatter: SOS.Ui.prototype.formatValueFancy,
          },
        },
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

        var table = '<table class="sos-table">';
        table += (SOS.Utils.isValidObject(options.header.headerLabel) ? '<caption class="sos-table">' + options.header.headerLabel + '</caption>' : '');
        table += tcontent;
        table += '</table>';
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
      },
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
              displayProjection: new OpenLayers.Projection("EPSG:4326"),
            },
          },
        },
        overview: {
          options: {
            show: false,
          },
        },
        baseLayer: {
          object: null,
          id: "sosMapBaseLayer",
          options: {
            label: "Background Layer",
            url: "http://vmap0.tiles.osgeo.org/wms/vmap0?",
            params: {
              layers: "basic",
            },
          },
        },
        offeringsLayer: {
          object: null,
          id: "sosMapOfferingsLayer",
          options: {
            label: "Offerings",
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
              "labelOutlineWidth": 3,
            }),
          },
        },
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
       * Set options for the offerings layer
       */
      setOfferingsLayerOptions: function(options) {
        jQuery.extend(true, this.config.offeringsLayer.options, options);
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
        this.initView();
        this.displayOfferings();
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

        // Setup the map object, its base layer, and its controls
        var map = new OpenLayers.Map(this.config.map.id, this.config.map.options.params);
        var baseLayer = new OpenLayers.Layer.WMS(this.config.baseLayer.options.label, this.config.baseLayer.options.url, this.config.baseLayer.options.params);

        map.addLayers([baseLayer]);
        map.addControl(new OpenLayers.Control.LayerSwitcher());
        map.addControl(new OpenLayers.Control.MousePosition());

        // Optionally generate the map overview
        if(this.config.overview.options.show) {
          var params = this.config.overview.options.params || {};
          map.addControl(new OpenLayers.Control.OverviewMap(params));
        }

        this.config.map.object = map;
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
       * Display the offerings layer
       */
      displayOfferings: function() {
        var styleMap = new OpenLayers.StyleMap(this.config.offeringsLayer.options.pointStyle);

        // Query FOIs from the SOS and present them as a vector layer
        var layer = new OpenLayers.Layer.Vector(this.config.offeringsLayer.options.label, {
          strategies: [new OpenLayers.Strategy.Fixed()],
          protocol: new OpenLayers.Protocol.SOS({
            formatOptions: {
              internalProjection: this.config.map.object.getProjectionObject(),
              externalProjection: this.config.map.options.defaultProjection
            },
            url: this.url,
            fois: this.sos.getFeatureOfInterestIds(),
          }),
          styleMap: styleMap
        });
        this.config.map.object.addLayer(layer);

        // Setup behaviour for this layer
        var ctrl = new OpenLayers.Control.SelectFeature(layer, {
          scope: this,
          onSelect: this.onFeatureSelect
        });
        this.config.map.object.addControl(ctrl);
        ctrl.activate();

        this.config.offeringsLayer.object = layer;
      },

      /**
       * Setup behaviour for when user clicks on a Feature of Interest (FOI)
       */
      onFeatureSelect: function(feature) {
        var item = {
          foi: {id: feature.attributes.id, geometry: feature.geometry},
        };
        var offerings = [];
        item.offerings = offerings.concat(this.sos.getOfferingsForFeatureOfInterestId(item.foi.id));

        // Store each selected item (FOI & associated offerings)
        this.config.map.selected = [];
        this.config.map.selected.push({item: item});

        // Show this FOI's latest observation values in a popup
        this.sos.registerUserCallback({event: "latestobsavailable", scope: this, callback: this.displayLatestObservations});
        this.sos.getLatestObservationsForFeatureOfInterestId(item.foi.id);
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
      },
    });
  }
}

